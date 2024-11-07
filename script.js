document.addEventListener('DOMContentLoaded', () => {
    const ws = new WebSocket('ws://117.110.12.94:8090');
    ws.onopen = function(event) {
        console.log('Connected to WebSocket server');
        show_calendar();
    };
    ws.onmessage = function(msg) {
        const message = JSON.parse(msg.data);
        if (message.type === "update_table") {
            add_table(message.data);
        } else if (message.type === "enter") {
            show_table(message.data);
        } else if (message.type === "delete_success") {
            location.reload(); // 삭제 성공 시 페이지 새로고침
        }
    };

    let currentSlide = 0;

    function previewImages(event) {
        const files = event.target.files;
        const slidesContainer = document.getElementById('slides-container');
        const indicatorsContainer = document.getElementById('indicators-container');
        slidesContainer.innerHTML = '';
        indicatorsContainer.innerHTML = '';

        if (files.length > 5) {
            alert('최대 5장까지 이미지를 선택할 수 있습니다.');
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                continue; // 이미지 파일이 아닌 경우 무시
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const slide = document.createElement('div');
                slide.classList.add('slide');
                const img = document.createElement('img');
                img.src = e.target.result;
                slide.appendChild(img);
                slidesContainer.appendChild(slide);
            };
            reader.readAsDataURL(file);

            // 인디케이터 생성
            const indicator = document.createElement('span');
            if (i === 0) indicator.classList.add('active');
            indicatorsContainer.appendChild(indicator);
        }

        currentSlide = 0;
        updateSlider();
    }

    function changeSlide(direction) {
        const slidesContainer = document.getElementById('slides-container');
        const totalSlides = slidesContainer.children.length;
        currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
        updateSlider();
    }

    function updateSlider() {
        const slidesContainer = document.getElementById('slides-container');
        const indicators = document.getElementById('indicators-container').children;
        slidesContainer.style.transform = `translateX(${-currentSlide * 100}%)`;

        for (let i = 0; i < indicators.length; i++) {
            indicators[i].classList.remove('active');
        }
        indicators[currentSlide].classList.add('active');
    }

    function get_data() {
        const Year = document.querySelector('#year').value.toString();
        const Month = document.querySelector('#month').value.toString();

        const data = {
            type: 'YYYYMM',
            year: Year,
            month: Month
        };
        ws.send(JSON.stringify(data));
    }

    function show_table(data) {
        const jsonObj = JSON.parse(data);
        const tableBody = document.querySelector('#dataTable tbody');
        tableBody.innerHTML = ""; // 기존 테이블 내용 초기화
        jsonObj.forEach((item, index) => {
            let row = `<tr>
                <td>${item.이름}</td>
                <td>${item.결제일자}</td>
                <td>${item.금액}</td>
                <td><button onclick="deleteRecord(${index})">삭제</button></td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    }

    function deleteRecord(index) {
        const year = document.querySelector('#year').value;
        const month = document.querySelector('#month').value;
        const data = {
            type: 'delete',
            index: index,
            year: year,
            month: month
        };
        ws.send(JSON.stringify(data));
    }

    function uploadImage(event) {
        event.preventDefault();

        const fileInput = document.getElementById('file-upload');
        const nameInput = document.getElementById('nameInput');
        const day_ = document.getElementById('day_');
        const equip = document.getElementById('equi');

        if (fileInput.files.length === 0 || nameInput.value === '') {
            alert('파일을 선택하고 이름을 입력하세요.');
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
                    buy_equi: equip.checked
                };
                ws.send(JSON.stringify(data));
            };
            reader.readAsArrayBuffer(file);
        }
        init_set();
    }

    function init_set() {
        const fileInput = document.getElementById('file-upload');
        fileInput.value = "";
        const imagePreview = document.getElementById('slides-container');
        imagePreview.innerHTML = '';
    }

    function show_calendar() {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const Year = document.querySelector('#year');
        for (let i = currentYear - 1; i <= currentYear; i++) {
            const YearOption = document.createElement('option');
            YearOption.setAttribute('value', i);
            YearOption.innerText = i;
            if (i === currentYear) {
                YearOption.selected = true;
            }
            Year.appendChild(YearOption);
        }

        const Month = document.querySelector('#month');
        for (let i = 1; i <= 12; i++) {
            const MonthOption = document.createElement('option');
            let mm = i < 10 ? "0" + i : i.toString();
            MonthOption.setAttribute('value', mm);
            MonthOption.innerText = i;
            if (i === currentMonth) {
                MonthOption.selected = true;
            }
            Month.appendChild(MonthOption);
        }
    }

    function toggleCheckbox(checkedId, otherId) {
        const checkedCheckbox = document.getElementById(checkedId);
        const otherCheckbox = document.getElementById(otherId);
        if (checkedCheckbox.checked) {
            otherCheckbox.checked = false;
        }
    }

    // 이벤트 리스너 등록
    document.getElementById('upload-form').addEventListener('submit', uploadImage);
    document.getElementById('file-upload').addEventListener('change', previewImages);
    document.getElementById('year').addEventListener('change', get_data);
    document.getElementById('month').addEventListener('change', get_data);

    window.previewImages = previewImages;
    window.changeSlide = changeSlide;
    window.show_list = get_data;
    window.toggleCheckbox = toggleCheckbox;
    window.deleteRecord = deleteRecord;
});
