from fastapi import FastAPI, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
from datetime import datetime
import traceback

from docxtpl import DocxTemplate

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATE_PATH = Path("agreements_templates/main.docx")
RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="DOCX Generator")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# --- Главная страница ---
@app.get("/")
async def serve_index():
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/generate_agreement")
async def generate_docx_endpoint(context: dict = Body(...)):
    """
    Принимает JSON-словарь с параметрами договора и возвращает .docx файл.
    Пример тела запроса:
    {
        "agreement_id": "1-2026",
        "agreement_date": "06 октября 2025 г.",
        "client_full_name": "Сидоров Андрей Леонидович",
        "client_short_name": "Сидоров А. Л.",
        "client_juridical_address": "188322, Ленинградская обл., Гатчинский р-н, г. Коммунар массив Ижора, ул. Ново-Антропшинская, д.8, кв. 51.",
        "client_mail_address": "г. Санкт-Петербург, ул. М. Балканская д. 62/25, кв. 35188322, Ленинградская обл., Гатчинский р-н, г. Коммунар массив Ижора, ул. Ново-Антропшинская, д.8, кв. 51.",
        "client_inn": "246516531448",
        "client_ogrn": "319774600333340",
        "client_bank_account": "40802810301500084768",
        "client_bank_name": " ООО Банк Точка",
        "client_bank_bik": "044525104",
        "client_bank_correspondent_account": "30101810745374525104",
        "client_phone": "+7 (916) 459 40 60",
        "client_email": "a.zhestovskii.dodo@gmail.com",
        "internet_services": [
            {"address": "Москва, пер. Победы, 27", "traffic": "Не ограничен", "speed": "30", "rent": "2500", "connection_fee": "10000"},
            {"address": "Питер, ул. Победы, 27", "traffic": "Не ограничен", "speed": "30", "rent": "2200", "connection_fee": "12000"}
        ],
        "additional_services": [
            {"name": "Аренда роутера Archer C5", "rent": "170", "comment": "Москва, пер. Победы, 27"}
        ],
        "device_services": [
            {"name": "Archer C5", "price": "5000", "amount": "2", "address": "Питер, ул. Победы, 27", "total_price": "10000"}
        ]
    }
    """
    try:
        if not context.get("additional_services"):
            context["additional_services"] = [{"name": "", "rent": "", "comment": ""}]
        if not context.get("device_services"):
            context["device_services"] = [{"name": "", "price": "", "amount": "", "address": "", "total_price": ""}]

        template_path = str(TEMPLATE_PATH)
        doc = DocxTemplate(template_path)
        doc.render(context)
        date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        agreement_path = RESULTS_DIR / f"Договор {context['client_short_name']} {date}"
        doc.save(agreement_path)

        # отдаём файл пользователю
        return FileResponse(
            agreement_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=Path(agreement_path).name,
        )

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": "Ошибка при генерации документа."},
        )
