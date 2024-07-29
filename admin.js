const ws = new WebSocket('ws://3.34.113.208:3030');
ws.onopen = function(event) {
    console.log('Connected to WebSocket server');
};
ws.onmessage = function(msg) {
    const message = JSON.parse(msg.data);
    if(message.type == "enter"){
        show_table(message.data);
    }
};
show_calendar();
function show_table(data){
    const jsonObj = JSON.parse(data);
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = "";
    jsonObj.forEach(item => {
        let row = `<tr><td>${item.이름}</td><td>${item.결제일자}</td><td>${item.금액}</td><td>${item.일일이용권}</td><td>${item.장비구매}</td></tr>`;
        tableBody.innerHTML += row;
    });
}


function image_download(){
    const Year = document.querySelector('#year').value.toString();
    const Month = document.querySelector('#month').value.toString();
    window.location.href = `/admin/imgs_download?year=${Year}&month=${Month}`;

}
function excel_download(){
    const Year = document.querySelector('#year').value.toString();
    const Month = document.querySelector('#month').value.toString();
    window.location.href = `/admin/excel_download?year=${Year}&month=${Month}`;
}


document.querySelector('#year').addEventListener('change', (event) => {
    get_data()
});
document.querySelector('#month').addEventListener('change', (event) => {
    get_data()
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
