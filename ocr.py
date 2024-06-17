import cv2
import pytesseract
import sys

def ocr(image_path):
    # 이미지 파일 로드
    img = cv2.imread(image_path)
    custom_config = r'--oem 2 -l kor --psm 6'  # Tesseract OCR 설정 (선택적)
    text = pytesseract.image_to_string(img, config=custom_config).split('\n')

    date_tag = ["거래일시","결제일","거래일자"]
    price_tag = ["승인금액","결제금액","매입금액","이용금액",]

    dict = {
        "date": "xx",
        "price": "yy"
    }

    for line in text:
        _str = line.replace(" ","")
        for dt in date_tag:
            if dt in _str:
                dict["date"] = _str.split(dt)[-1]

        for pt in price_tag:
            if pt in _str:
                dict["price"] = _str.split(pt)[-1]

    print(dict)
    return

if __name__ == "__main__":
    img_path = sys.argv[1]
    ocr(img_path)
