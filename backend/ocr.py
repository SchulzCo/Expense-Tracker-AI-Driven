import openai
import os
from dotenv import load_dotenv
import json
import base64
import io

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-flash-1.5")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = None

# Prioritize OpenRouter if configured
if OPENROUTER_API_KEY and OPENROUTER_API_KEY != "sk-or-v1-...":
    client = openai.OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
        default_headers={
            "HTTP-Referer": "http://localhost:3000", # Required by OpenRouter
            "X-Title": "Schulz Expense Tracker",    # Optional but recommended
        }
    )
elif OPENAI_API_KEY and not OPENAI_API_KEY.startswith("your-openai-api-key"):
    client = openai.OpenAI(api_key=OPENAI_API_KEY)

def get_model():
    if OPENROUTER_API_KEY and OPENROUTER_API_KEY != "sk-or-v1-...":
        return OPENROUTER_MODEL
    return "gpt-4o"

async def process_receipt(image_data: bytes, categories: list = None):
    if not client:
        print("AI client not initialized. check OPENAI_API_KEY or OPENROUTER_API_KEY in .env")
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
    2. Monto de IVA (Tax/IVA) (float, si no se encuentra pon 0.0)
    3. Descripción o nombre del comercio (string)
    4. Fecha (formato YYYY-MM-DD o el más cercano posible)
    5. Categoría Sugerida (DEBES elegir estrictamente una de estas: {categories_str})
    
    Responde estrictamente en formato JSON como este:
    {{
        "amount": 12.50,
        "tax_amount": 2.10,
        "description": "Starbucks Coffee",
        "date": "2024-03-10",
        "category": "Comida",
        "ocr_text": "... texto completo extraído del recibo ..."
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model=get_model(),
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente experto en contabilidad que extrae datos de recibos con precisión quirúrgica. RESPONDE SIEMPRE EN FORMATO JSON."
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
            ]
        )
        
        content = response.choices[0].message.content
        
        # Robust JSON extraction
        try:
            # Try to find JSON in code blocks first
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            else:
                json_str = content.strip()
                
            result = json.loads(json_str)
        except Exception as je:
            print(f"Error parsing JSON from AI content: {je}")
            print(f"Raw content: {content}")
            return None
        
        # Validación básica de categoría para asegurar que coincida con las enviadas
        if result.get("category") not in categories:
            # Si no coincide, intentar buscar la más parecida o poner "Otros"
            if "Otros" in categories:
                result["category"] = "Otros"
            else:
                result["category"] = categories[0]
                
        return result
    except Exception as e:
        print(f"Error processing with AI: {e}")
        return None
