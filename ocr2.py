import os.path
import re
import cv2
import pytesseract
import sys
import openpyxl



def write_data_to_excel(dict_data, excel_path):

    if os.path.exists(excel_path):
        workbook = openpyxl.load_workbook(excel_path)
        sheet = workbook.active
    else:
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.append(["이름","결제일자","금액","일일이용권","장비구매","이미지경로"])

    sheet.append([dict_data[0], dict_data[1], dict_data[2],
                  "O" if dict_data[3] == 'true' else ' ',
                  "O" if dict_data[4] == 'true' else ' ',
                  dict_data[5]])
    workbook.save(excel_path)
    workbook.close()
    return


def ocr(image_path, name, day_, buy):
    img = cv2.imread(image_path)


    # 원래 이미지 크기 가져오기
    original_height, original_width = img.shape[:2]

    prop = 1.6

    # 축소된 크기 계산
    new_width = int(original_width * prop)
    new_height = int(original_height * prop)

    # 이미지 크기 조정
    img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)

    custom_config = r'--oem 3 -l kor --psm 6'  # Tesseract OCR 설정 (선택적)
    text = pytesseract.image_to_string(img, config=custom_config).split('\n')
    date_tag = ["거래일시","거래일자","결제일시","이용일시","결제일","거래일","시간"]
    price_tag = ["공급가액","가액","승인금액","결제금액","매입금액","이용금액","받은금액","상품권","거래금액","금액","대금"]
    can_tag = ["취소","부가"]
    dict = [name, "", "", day_, buy, image_path]
    tx = ["부가세"]
    for line in text:
        _str = line.rstrip().replace(" ","")
        for dt in date_tag:
            if dt in _str:
                print(_str)
                _str = re.sub('\D',' ',_str)
                plist = _str.split(' ')
                plist = [e for e in plist if e != '']
                print(_str)
                print(plist)
                if len(plist) == 6: # YY MM DD hh mm ss
                    YY = plist[0]
                    MM = plist[1]
                    DD = plist[2]
                elif len(plist) == 5: # YY MM DDhh mm ss
                    YY = plist[0]
                    MM = plist[1]
                    DD = plist[2][:-2]

                elif len(plist) == 4: # YY MMDDhh
                    YY = plist[0]
                    if len(plist[1]) <= 2: # YY MM DDhh ~
                        MM = plist[1]
                        DD = plist[2][:-2]
                    else: # YY MMDD ~
                        if len(plist[1]) == 6:
                            MM = plist[1][:2]
                            DD = plist[1][2:4]
                        elif len(plist[1]) == 5: ## 일 또는 월이 1자리이다.
                            MM = plist[1][:2] 
                            DD = plist[1][2:4]
                        else:
                            # to do something
                            a = 1

                elif len(plist) == 3:
                    YY = plist[0]
                    MM = plist[1]
                    DD = plist[2]
                else: # 2 또는 1인데... 이건뭐 답이없음
                    YY = 2024
                    MM = 1
                    DD = 1

                if len(YY) == 2:
                    YY = "20" + YY
                if len(MM) == 1:
                    MM = "0" + MM
                if len(DD) == 1:
                    DD = "0" + DD

                dict[1] = YY + "년 " + MM +"월 " + DD + "일"

        for pt in price_tag:
            if pt in _str and pt not in can_tag:
                dict[2] = re.sub(r'\D','',_str)

        for txt in tx:
            if txt in _str:
                tax = re.sub(r'\D','',_str)

    if int(dict[2]) % 10 != 0:
        dict[2] = str(int(dict[2]) + int(tax))

    #print(dict)

    if dict[2] == "" or dict[1] == "":
        return
    write_data_to_excel(dict, f"./data_{YY}{MM}.xlsx")
    return


if __name__ == "__main__":

    img_path = sys.argv[1]
    name = sys.argv[2]
    day_ = sys.argv[3]
    buy = sys.argv[4]

    ocr(img_path, name, day_, buy)

    # img_list = os.listdir(img_path)
    # for imgpath in img_list:
    #     dir_path = './'+ img_path +'/' + imgpath
    #     print(dir_path)
    #     ocr(dir_path, name, day_, buy)
