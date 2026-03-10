import openai
import os
from dotenv import load_dotenv
import json
import base64
import io

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = None
if OPENAI_API_KEY and OPENAI_API_KEY != "your-openai-api-key":
    client = openai.OpenAI(api_key=OPENAI_API_KEY)

async def process_receipt(image_data: bytes, categories: list = None):
    if not client:
        print("OpenAI client not initialized. check OPENAI_API_KEY in .env")
        return None
        
    # Categorías por defecto si no se proporcionan
    if not categories:
        categories = ["Comida", "Transporte", "Compras", "Servicios", "Salud", "Entretenimiento", "Otros"]
    
    # Encode image to base64
    base64_image = base64.b64encode(image_data).decode('utf-8')
    
    categories_str = ", ".join(categories)
    
    prompt = f"""
    Extrae la siguiente información de esta imagen de recibo:
    1. Monto Total (float)
    2. Descripción o nombre del comercio (string)
    3. Fecha (formato YYYY-MM-DD o el más cercano posible)
    4. Categoría Sugerida (DEBES elegir estrictamente una de estas: {categories_str})
    
    Responde estrictamente en formato JSON como este:
    {{
        "amount": 12.50,
        "description": "Starbucks Coffee",
        "date": "2024-03-10",
        "category": "Comida",
        "ocr_text": "... texto completo extraído del recibo ..."
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente experto en contabilidad que extrae datos de recibos con precisión quirúrgica."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Validación básica de categoría para asegurar que coincida con las enviadas
        if result.get("category") not in categories:
            # Si no coincide, intentar buscar la más parecida o poner "Otros"
            if "Otros" in categories:
                result["category"] = "Otros"
            else:
                result["category"] = categories[0]
                
        return result
    except Exception as e:
        print(f"Error processing with OpenAI: {e}")
        return None
