import os.path

import cv2
import pytesseract
import sys
import openpyxl

def write_data_to_excel(dict_data, excel_path = "./table.xlsx"):

    if os.path.exists(excel_path):
        workbook = openpyxl.load_workbook(excel_path)
        sheet = workbook.active
    else:
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.append(["이름","결제일자","금액","일일이용권","암벽화대여","장비구매"])

    sheet.append([dict_data[0], dict_data[1], dict_data[2],
                  "O" if dict_data[3] == 'true' else ' ',
                  "O" if dict_data[4] == 'true' else ' ',
                  "O" if dict_data[5] == 'true' else ' '
                  ])
    workbook.save(excel_path)
    return

def ocr(image_path, name, day_, shoe, buy):
    img = cv2.imread(image_path)
    custom_config = r'--oem 3 -l kor --psm 6'  # Tesseract OCR 설정 (선택적)
    text = pytesseract.image_to_string(img, config=custom_config).split('\n')
    date_tag = ["거래일시","결제일","거래일자","결제일시","이용일시"]
    price_tag = ["승인금액","결제금액","매입금액","이용금액","받은금액"]

    dict = [name, "", "", day_, shoe, buy]

    for line in text:
        _str = line.rstrip().replace(" ","")
        print(_str)
        for dt in date_tag:
            if dt in _str:
                dict[1] = _str.split(dt)[-1]

        for pt in price_tag:
            if pt in _str:
                dict[2] = _str.split(pt)[-1].replace(",","").replace(".","")
                price = 0
                for ch in dict[2]:
                    if ch >= '0' and ch <= '9':
                        price = price * 10 + int(ch)
                if price % 10 != 0:
                    price = int(price * 1.1)
                dict[2] = price
    print(dict)
    if dict[2] == "" or dict[1] == "":
        return
    write_data_to_excel(dict, "./table.xlsx")
    return


if __name__ == "__main__":

    img_path = sys.argv[1]
    name = sys.argv[2]
    day_ = sys.argv[3]
    shoe = sys.argv[4]
    buy = sys.argv[5]

    ocr(img_path, name, day_, shoe, buy)
