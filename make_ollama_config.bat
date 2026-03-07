@echo off
(
echo plugins:
echo   generators:
echo     rest:
echo       RestGenerator:
echo         uri: "http://localhost:11434/api/generate"
echo         method: POST
echo         headers:
echo           Content-Type: application/json
echo         req_template_json_object:
echo           model: "llama3.2"
echo           prompt: $INPUT
echo           stream: false
echo         response_json: true
echo         response_json_field: "response"
echo         request_timeout: 60
) > D:\shield\ollama_config.yaml
echo Done! ollama_config.yaml created.
type D:\shield\ollama_config.yaml
