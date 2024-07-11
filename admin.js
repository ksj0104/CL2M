const ws = new WebSocket('ws://10.10.30.241:3030');
ws.onopen = function(event) {
    console.log('Connected to WebSocket server');
};
ws.onmessage = function(msg) {
    const message = JSON.parse(msg.data);
    if(message.type == "enter"){
        show_table(message.data);
    }
};

function show_table(data){
    const jsonObj = JSON.parse(data);
    const tableBody = document.querySelector('#dataTable tbody');

    jsonObj.forEach(item => {
        let row = `<tr><td>${item.이름}</td><td>${item.결제일자}</td><td>${item.금액}</td><td>${item.일일이용권}</td><td>${item.암벽화대여}</td><td>${item.장비구매}</td></tr>`;
        tableBody.innerHTML += row;
    });
}


function image_download(){
    window.location.href = '/admin/imgs_download';
}
function excel_download(){
    window.location.href = '/admin/excel_download';
}
