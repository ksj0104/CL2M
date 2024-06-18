const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const ExcelJS = require('exceljs');
const Hangul = require('hangul-js');

// 사용자 세션을 저장할 객체
const sessions = {};

// 클라이언트 접속자 리스트
let clients = [];
const https_host = "10.10.30.241"
const ws_host = "10.10.30.241"
const wss = new WebSocket.Server({ host: ws_host, port: 3030 });
const UPLOAD_DIR = "imgs"
const EXCEL_FILE = "table.xlsx"

// HTTP 서버 생성
const server = http.createServer((req, res) => {
    // 쿠키를 파싱하여 세션 아이디를 추출합니다.
    const cookies = parseCookies(req);
    let sessionID = cookies.sessionID;

    // 세션 아이디가 없으면 새로 생성합니다.
    if (!sessionID) {
        sessionID = generateSessionID();
        // 쿠키에 세션 아이디를 설정합니다.
        res.setHeader('Set-Cookie', `sessionID=${sessionID}; HttpOnly; Path=/`);
    }

    // 세션에 사용자 정보를 저장합니다.
    if (!sessions[sessionID]) {
        sessions[sessionID] = {
            userID: generateUserID()
        };
    }

    if (req.url === '/') {
        let filePath = path.join(__dirname, 'index.html');
        // 파일을 비동기적으로 읽습니다.
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('404 Not Found');
            } else {
                // 정상적으로 파일을 읽은 경우 HTML 내용을 반환합니다.
                res.writeHead(200, {'Content-Type': 'text/html'});
                console.log(`Session ID: ${sessionID}\nUser ID: ${sessions[sessionID].userID}`);
                res.end(data);

            }
        });
    }
    else {
        // 다른 경로로의 요청에 대해서는 404 에러를 반환합니다.
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 Not Found');
    }
});

// 서버를 시작합니다.
const port = 3000;
server.listen(port, https_host, () => {
    console.log(`Server running at http://${https_host}:${port}/`);
});

// 쿠키를 파싱하는 함수
function parseCookies(req) {
    const cookieHeader = req.headers.cookie;
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            const key = parts.shift().trim();
            const value = parts.join('=');
            cookies[key] = value;
        });
    }
    return cookies;
}

// 세션 아이디 생성 함수
function generateSessionID() {
    return crypto.randomBytes(16).toString('hex');
}

// 사용자 아이디 생성 함수
function generateUserID() {
    return crypto.randomBytes(8).toString('hex');
}

function dup_id_check(w_id){
    for(let i = 0 ; i < clients.length; i ++){
        if(clients[i].userID == w_id){
            console.log("duplicated id")
            return false;
        }
    }
    return true;
}

function broadcastMSG(type, context){
    clients.forEach(client => {
        client.ws.send(JSON.stringify({ type: type, data: context }));
    });
}


wss.on('connection', function connection(ws) {
    console.log('New client connected');
    let userID = ""
    while(true){
        userID = 'User' + Math.floor(Math.random() * 100000); // 임의의 사용자 아이디 생성
        if(dup_id_check(userID)){
            clients.push({ ws: ws, userID: userID});
            break;
        }
    }
    readExcelFile(EXCEL_FILE, ws);
    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        if (data.type === 'image') {

            const buffer = Buffer.from(data.imageData, 'base64');
            const username = data.username;
            const expe = data.filename.split('.')[1]
            const file_name = convertHangulToEnglish(username) +'_'+generateSecureRandomString(8) + '.' + expe;
            const file_path = path.join(UPLOAD_DIR, file_name);

            fs.writeFile(file_path, buffer, err => {
                if (err) {
                    ws.send(JSON.stringify({ type: 'error', message: 'File save error' }));
                }
                else {
                    ws.send(JSON.stringify({ type: 'success', message: 'File uploaded successfully' }));
                    ocr(file_path, username, data.day_use, data.shoe_rent, data.buy_equi);
                }
          });
        }
    });

    // 클라이언트가 연결을 종료할 때
    ws.on('close', function close() {
        broadcastMSG('info', userID + " 님이 퇴장 하셨습니다.")
        console.log('Client disconnected');
        clients = clients.filter(client => client.ws !== ws);
    });
});


function ocr(image_path, user_name, day_, shoe, buy){
    console.log(image_path, user_name);
    const pythonProcess = spawn('python', ['ocr.py', image_path, user_name, day_, shoe, buy]);
    pythonProcess.stdout.on('data', (data) => {
        console.log(data)
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        readLastData(EXCEL_FILE)
    });
}

async function readLastData(filename) {
    const workbook = new ExcelJS.Workbook();
    try {
    // 엑셀 파일 로드
        await workbook.xlsx.readFile(filename);

    // 첫 번째 시트 선택 (index는 1부터 시작)
        const worksheet = workbook.getWorksheet(1);
        // 첫 번째 행과 마지막 행 가져오기
        const headers = worksheet.getRow(1).values.slice(1); // 첫 번째 행의 값들 (첫 번째 열은 빈 값이므로 제외)
        const lastRowValues = worksheet.getRow(worksheet.rowCount).values.slice(1); // 마지막 행의 값들 (첫 번째 열은 빈 값이므로 제외)

        // 첫 번째 행을 키로, 마지막 행을 값으로 변환
        const result = {};
            headers.forEach((header, index) => {
            result[header] = lastRowValues[index];
        });
        broadcastMSG("update_table", JSON.stringify(result));

    } catch (error) {
        console.error('엑셀 파일 읽기 실패:', error);
    }
}

async function readExcelFile(filename, ws) {
    const workbook = new ExcelJS.Workbook();
    try {
    // 엑셀 파일 로드
        await workbook.xlsx.readFile(filename);

    // 첫 번째 시트 선택 (index는 1부터 시작)
        const worksheet = workbook.getWorksheet(1);

        let data = [];

        let headers = [];
        // 시트에서 각 행을 순회하며 데이터 추출
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
            if (rowNumber === 1) {
            // 첫 번째 행은 헤더로 사용
                row.eachCell((cell) => {
                    headers.push(cell.value);
                });
            } else {
            // 데이터 행
                let rowData = {};
                    row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber - 1]] = cell.value;
                });
                data.push(rowData);
            }
        });
        let _json = JSON.stringify(data, null, 2);
        ws.send(JSON.stringify({ type: 'enter', data: _json }));
    } catch (error) {
        console.error('엑셀 파일 읽기 실패:', error);
    }
}


function generateSecureRandomString(length) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}



function convertHangulToEnglish(koreanString) {
  // 한글을 자음과 모음으로 분리
  const disassembled = Hangul.disassemble(koreanString);

  // 분리된 자음과 모음을 로마자로 변환
  const romanized = Hangul.assemble(disassembled.map(char => {
    switch (char) {
      case 'ㄱ': return 'k';
      case 'ㄲ': return 'kk';
      case 'ㄴ': return 'n';
      case 'ㄷ': return 'd';
      case 'ㄸ': return 'tt';
      case 'ㄹ': return 'r';
      case 'ㅁ': return 'm';
      case 'ㅂ': return 'b';
      case 'ㅃ': return 'pp';
      case 'ㅅ': return 's';
      case 'ㅆ': return 'ss';
      case 'ㅇ': return '';
      case 'ㅈ': return 'j';
      case 'ㅉ': return 'jj';
      case 'ㅊ': return 'ch';
      case 'ㅋ': return 'k';
      case 'ㅌ': return 't';
      case 'ㅍ': return 'p';
      case 'ㅎ': return 'h';
      default: return '';
    }
  }));

  return romanized;
}
