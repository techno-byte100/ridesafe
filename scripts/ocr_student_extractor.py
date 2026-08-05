import sys
import json
import os
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Define the expected schema for TrackBuddy students
STUDENT_SCHEMA = {
    "students": [
        {
            "name": "Full name of the student",
            "dob": "Date of birth (YYYY-MM-DD)",
            "pickup_address": "Full pickup address",
            "dropoff_address": "Full dropoff address",
            "guardian_name": "Name of the primary guardian",
            "guardian_phone": "Contact number of the guardian",
            "guardian_email": "Email address of the guardian",
            "branch_name": "Name of the branch or school"
        }
    ]
}

def process_ocr(image_path):
    try:
        model_id = "zai-org/GLM-OCR"
        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_id, 
            trust_remote_code=True, 
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )
        model.eval()

        # Construct the prompt for structured extraction
        schema_str = json.dumps(STUDENT_SCHEMA, indent=2)
        query = f"Extract student information from this document into the following JSON schema: {schema_str}"
        
        # This is a simplified version of the GLM-OCR call logic
        # In a real scenario, we'd use the helper classes from glm_ocr_examples.py
        # but here we'll assume the environment is already set up.
        
        inputs = tokenizer(query, return_tensors="pt").to(model.device)
        # Note: In actual GLM-OCR, we'd pass the image here too
        # For the purpose of this integration, we'll simulate the call
        
        # [SIMULATION of result for demonstration, in production this uses model.generate]
        # output = model.generate(...)
        
        # Mock result for now to verify pipeline
        result = {
            "students": [
                {
                    "name": "John Doe",
                    "dob": "2015-05-20",
                    "pickup_address": "123 Maple St, KL",
                    "dropoff_address": "TrackBuddy Academy",
                    "guardian_name": "Jane Doe",
                    "guardian_phone": "+60123456789",
                    "guardian_email": "jane@example.com",
                    "branch_name": "KL Central"
                }
            ]
        }
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    process_ocr(sys.argv[1])
