const ws = new WebSocket('ws://10.10.30.241:3030');
ws.onopen = function(event) {
    console.log('Connected to WebSocket server');
};
ws.onmessage = function(msg) {

    const message = JSON.parse(msg.data);``
    console.log(message.data)
    if(message.type == "update_table"){
        console.log(message.data);
        add_table(message.data);
    }
    else if(message.type == "enter"){
        console.log(message.data);
        show_table(message.data);
    }
};
document.getElementById('fileInput').addEventListener('change', function() {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();

    reader.onload = function(e) {
      const imagePreview = document.getElementById('imagePreview');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
    };

    reader.readAsDataURL(file);
  }
});
function add_table(data){

    const jsonObj = JSON.parse(data);
    const tableBody = document.querySelector('#dataTable tbody');
    // let row = `<tr><td>${jsonObj.이름}</td><td>${jsonObj.결제일자}</td><td>${jsonObj.금액}</td><td>${jsonObj.일일이용권}</td><td>${jsonObj.암벽화대여}</td><td>${jsonObj.장비구매}</td></tr>`;
    let row = `<tr><td>${jsonObj.이름}</td><td>${jsonObj.결제일자}</td><td>${jsonObj.금액}</td></tr>`;
    tableBody.innerHTML += row;
}
function show_table(data){
    const jsonObj = JSON.parse(data);
    const tableBody = document.querySelector('#dataTable tbody');

    jsonObj.forEach(item => {
        let row = `<tr><td>${item.이름}</td><td>${item.금액}</td><td>${item.결제일자}</td></tr>`;
        // let row = `<tr><td>${item.이름}</td><td>${item.결제일자}</td><td>${item.금액}</td><td>${item.일일이용권}</td><td>${item.암벽화대여}</td><td>${item.장비구매}</td></tr>`;
        tableBody.innerHTML += row;
    });
}
function uploadImage() {
    const fileInput = document.getElementById('fileInput');
    const nameInput = document.getElementById('nameInput');

    const day_ = document.getElementById('day_')
    const shoe = document.getElementById('shoe');
    const equip = document.getElementById('equi');


    if (fileInput.files.length === 0 || nameInput.value === '') {
        alert('Please select a file and enter a filename');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        const arrayBuffer = reader.result;
        const base64String = btoa(
            new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const data = {
            type: 'image',
            filename: file.name,
            username: nameInput.value,
            imageData: base64String,
            day_use: day_.checked,
            shoe_rent : shoe.checked,
            buy_equi : equip.checked
        };
        ws.send(JSON.stringify(data));
    };
    reader.readAsArrayBuffer(file);
}
