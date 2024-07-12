const ws = new WebSocket('ws://10.10.30.241:3030');
ws.onopen = function(event) {
    console.log('Connected to WebSocket server');
    show_calendar();
};
ws.onmessage = function(msg) {
    const message = JSON.parse(msg.data);
    if(message.type === "update_table"){
        add_table(message.data);
    }
    else if(message.type === "enter"){
        show_table(message.data);
    }
};

document.getElementById('fileInput').addEventListener('change', function() {
    const file = this.files[0];
    if (this.files.length === 1) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagePreview = document.getElementById('imagePreview');
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
    else{
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.style = "display: none;"
    }
});

function get_data(){
    const Year = document.querySelector('#year').value.toString()
    const Month = document.querySelector('#month').value.toString()

    const data = {
        type: 'YYYYMM',
        year: Year,
        month: Month
    }
    ws.send(JSON.stringify(data));
}

function show_table(data){
    const jsonObj = JSON.parse(data);
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ""
    jsonObj.forEach(item => {
        let row = `<tr><td>${item.이름}</td><td>${item.결제일자}</td><td>${item.금액}</td></tr>`;
        tableBody.innerHTML += row;
    });
}
function uploadImage() {
    const fileInput = document.getElementById('fileInput');
    const nameInput = document.getElementById('nameInput');

    const day_ = document.getElementById('day_')
    // const shoe = document.getElementById('shoe');
    const equip = document.getElementById('equi');


    if (fileInput.files.length === 0 || nameInput.value === '') {
        alert('Please select a file and enter a filename');
        init_set();
        return;
    }

    const files = fileInput.files;
    for (const file of files) {
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
                // shoe_rent: shoe.checked,
                buy_equi: equip.checked
            };
            ws.send(JSON.stringify(data));
        };
        reader.readAsArrayBuffer(file);
    }
    init_set();
}
document.querySelector('#year').addEventListener('change', (event) => {
    get_data()
});
document.querySelector('#month').addEventListener('change', (event) => {
    get_data()
});

function show_list(){
    get_data();
}

function init_set(){
    const fileInput = document.getElementById('fileInput');
    fileInput.value = ""
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.style = "display: none;"
}

function show_calendar() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const Year = document.querySelector('#year')
    for (var i = currentYear-1; i <= currentYear; i++) {
        const YearOption = document.createElement('option')
        YearOption.setAttribute('value', i)
        YearOption.innerText = i;
        if(i === currentYear){
            YearOption.selected = true;
        }
        Year.appendChild(YearOption);
    }

    const Month = document.querySelector('#month')

    for (var i = 1; i <= 12; i++) {
        const MonthOption = document.createElement('option')
        var mm = "";
        if(i < 10){
            mm = "0" + i.toString();
        }
        else{
            mm = i.toString()
        }
        MonthOption.setAttribute('value', mm)
        MonthOption.innerText = i;
        if (i === currentMonth) {
            MonthOption.selected = true;
        }
        Month.appendChild(MonthOption);
    }
}
