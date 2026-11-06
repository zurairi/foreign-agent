"""Small explicit API connectivity check; never prints credentials or raw errors."""
import json
from pathlib import Path
import urllib.request
import urllib.error
import re

def load_key():
    for line in Path(__file__).with_name('.env').read_text().splitlines():
        if line.startswith('OPENAI_API_KEY='):
            key = line.split('=', 1)[1].strip().strip('\"\'')
            if not re.fullmatch(r'sk-[A-Za-z0-9_-]+', key):
                raise ValueError('API key format invalid. Update the local .env file.')
            return key
    raise ValueError('Missing API key entry')

if __name__ == '__main__':
    payload = json.dumps({'model': 'gpt-4.1-mini', 'input': 'Reply with exactly: API connection works', 'max_output_tokens': 32, 'store': False}).encode()
    request = urllib.request.Request('https://api.openai.com/v1/responses', data=payload, headers={'Authorization': 'Bearer ' + load_key(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
        output = ''.join(c.get('text', '') for o in result.get('output', []) for c in o.get('content', []) if c.get('type') == 'output_text')
        print(json.dumps({'success': output.strip() == 'API connection works', 'model': result.get('model'), 'usage': result.get('usage')}))
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read()).get('error', {})
            code = detail.get('code')
            safe_codes = {'insufficient_quota', 'rate_limit_exceeded', 'credit_balance_exhausted', 'invalid_api_key', 'model_not_found'}
            code = code if code in safe_codes else 'other_api_error'
        except (ValueError, AttributeError):
            code = 'unreadable_api_error'
        print(json.dumps({'success': False, 'http_status': error.code, 'error_code': code}))
        raise SystemExit(1)
    except urllib.error.URLError:
        print('Network connection failed; no credential details logged.')
        raise SystemExit(2)
