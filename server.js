const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const ExcelJS = require('exceljs');
const Hangul = require('hangul-js');
const archiver = require('archiver');
const moment = require('moment');

// 사용자 세션을 저장할 객체
const sessions = {};

// 클라이언트 접속자 리스트
let clients = [];
const https_host = "10.10.30.241"
const ws_host = "10.10.30.241"
const wss = new WebSocket.Server({ host: ws_host, port: 3030 });
const UPLOAD_DIR = "imgs"

function get_excel_path(){
    const now = moment();
    const year = now.format('YYYY');
    const month = now.format('MM');
    return `data_${year}${month}.xlsx`;
}

// HTTP 서버 생성
const server = http.createServer(async (req, res) => {
    // 쿠키를 파싱하여 세션 아이디를 추출합니다.
    const cookies = parseCookies(req);
    let sessionID = cookies.sessionID;

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

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

    if (pathname === '/') {
        let filePath = path.join(__dirname, 'index_m.html');
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
    else if (pathname === '/admin/excel_download') {

        const year = parsedUrl.query.year;
        const month = parsedUrl.query.month;
        const xlsx_path = path.join(__dirname, `data_${year}${month}.xlsx`)
        console.log(xlsx_path + "다운로드 요청")
        fs.access(xlsx_path, fs.constants.F_OK, (err) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename=' + `data_${year}${month}.xlsx`
            });
            fs.createReadStream(xlsx_path).pipe(res);
        });
    }
    else if (pathname === '/admin/imgs_download') {


        const year = parsedUrl.query.year;
        const month = parsedUrl.query.month;
        const xlsx_path = path.join(__dirname, `data_${year}${month}.xlsx`)
        try {
            const imagePaths = await readLastColumn(xlsx_path);
            const zipFilePath = path.join(__dirname, 'images.zip');
            await createZipFromImages(imagePaths, zipFilePath);

            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=${path.basename(zipFilePath)}`
            });

            const readStream = fs.createReadStream(zipFilePath);
            readStream.pipe(res);
        } catch (error) {
            console.error('오류가 발생했습니다:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }

    }
    else if (pathname === '/admin') {

        let filePath = path.join(__dirname, 'cl2m_admin.html');
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
    else if (pathname === '/admin.js') {
      fs.readFile('admin.js', (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(data);
      });
    }
    else if (pathname === '/script.js') {
      fs.readFile('script.js', (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(data);
      });
    }
    else if (pathname === '/styles.css') {
        fs.readFile('styles.css', (err, data) => {
            if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
            }
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(data);
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

function create_file(filepath) {
    // 파일 존재 여부 확인
    if (!fs.existsSync(filepath)) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');

        // 테이블 헤더 추가 "이름","결제일자","금액","일일이용권","장비구매","이미지경로"
        worksheet.columns = [
            {header: '이름', key: '이름', width: 30},
            {header: '결제일자', key: '결제일자', width: 30},
            {header: '금액', key: '금액', width: 30},
            {header: '일일이용권', key: '일일이용권', width: 30},
            {header: '장비구매', key: '장비구매', width: 30},
            {header: '이미지경로', key: '이미지경로', width: 30}
        ];

        // 엑셀 파일 쓰기
        workbook.xlsx.writeFile(filepath)
            .then(() => {
                console.log('엑셀 파일이 생성되었습니다.');
            })
            .catch((err) => {
                console.error('파일 생성 중 오류가 발생했습니다:', err);
            });
    }
}
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
    // default 는 현재 년월로 구성된 파일을 읽어온다.
    readExcelFile(get_excel_path(), ws);
    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        if (data.type === 'image') {
            const buffer = Buffer.from(data.imageData, 'base64');
            const username = data.username;
            const expe = data.filename.split('.')[1];
            const file_name = convertHangulToEnglish(username) +'_'+generateSecureRandomString(8) + '.' + expe;
            const file_path = path.join(UPLOAD_DIR, file_name);
            fs.writeFile(file_path, buffer, err => {
                if (err) {
                    ws.send(JSON.stringify({ type: 'error', message: 'File save error' }));
                }
                else {
                    ws.send(JSON.stringify({ type: 'success', message: 'File uploaded successfully' }));
                    ocr(file_path, username, data.day_use, data.buy_equi, ws);
                }
          });
        }
        else if(data.type === 'YYYYMM'){ // 캘린더에 해당하는 파일 불러오기
            readExcelFile(`data_${data.year}${data.month}.xlsx`, ws);
        }
    });

    // 클라이언트가 연결을 종료할 때
    ws.on('close', function close() {
        broadcastMSG('info', userID + " 님이 퇴장 하셨습니다.")
        console.log('Client disconnected');
        clients = clients.filter(client => client.ws !== ws);
    });
});


function ocr(image_path, user_name, day_, buy){
    // console.log(image_path, user_name);
    const pythonProcess = spawn('python', ['ocr.py', image_path, user_name, day_, buy]);
    pythonProcess.stdout.on('data', (data) => {
        console.log(data)
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}
async function readExcelFile(filename, ws) {
    // 없으면 파일 생성
    create_file(filename);
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

// 엑셀 파일에서 이미지 경로 읽기 함수
async function readLastColumn(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1); // 첫 번째 워크시트 선택

    const imagePaths = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // 두 번째 행부터 읽기
            const lastCell = row.getCell(row.cellCount);
            if (lastCell.value) {
                imagePaths.push(lastCell.value);
            }
        }
    });

    return imagePaths;
}

// 이미지 경로 리스트를 사용하여 압축 파일 생성 함수
function createZipFromImages(imagePaths, outputZipPath) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(imagePaths)) {
            return reject(new TypeError('imagePaths should be an array'));
        }

        // 출력 스트림 생성
        const output = fs.createWriteStream(outputZipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // 최고 압축 수준
        });

        // 스트림 이벤트 핸들러 설정
        output.on('close', () => {
            console.log(`압축 파일이 생성되었습니다: ${outputZipPath} (${archive.pointer()} total bytes)`);
            resolve();
        });

        archive.on('warning', (err) => {
            if (err.code !== 'ENOENT') {
                console.warn(err);
            }
        });

        archive.on('error', (err) => {
            reject(err);
        });

        // 아카이브와 출력 스트림 연결
        archive.pipe(output);

        // 이미지 파일들을 압축에 추가
        imagePaths.forEach((imagePath) => {
            const fileName = path.basename(imagePath);
            archive.file(imagePath, { name: fileName });
        });

        // 압축 완료
        archive.finalize();
    });
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
