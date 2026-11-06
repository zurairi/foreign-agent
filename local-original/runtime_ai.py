"""Optional server-side OpenAI adapter. Credentials never reach the browser."""
import json
import urllib.request
import urllib.error
from check_api import load_key

MODEL = 'gpt-4.1-mini'

def response_text(instructions, source_input, limit=3500):
    request = urllib.request.Request('https://api.openai.com/v1/responses',
        data=json.dumps({'model': MODEL, 'instructions': instructions, 'input': source_input,
                         'max_output_tokens': limit, 'store': False}).encode(),
        headers={'Authorization': 'Bearer ' + load_key(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            value = json.load(response)
    except urllib.error.HTTPError as error:
        try:
            code = json.loads(error.read()).get('error', {}).get('code')
        except (ValueError, AttributeError):
            code = None
        messages = {'credit_balance_exhausted': 'No active API credits for this key’s organisation. Check API billing.',
                    'insufficient_quota': 'API quota unavailable. Check credits and account limits.',
                    'rate_limit_exceeded': 'API rate limit reached. Wait before retrying.',
                    'invalid_api_key': 'API key rejected. Update the local .env file.'}
        raise ValueError(messages.get(code, f'OpenAI returned HTTP {error.code}; analysis was not saved.')) from None
    except (urllib.error.URLError, TimeoutError):
        raise ValueError('OpenAI could not be reached. Retry later or use manual analysis.') from None
    if value.get('status') != 'completed':
        raise ValueError('OpenAI analysis was incomplete. No results were saved.')
    return ''.join(c.get('text', '') for o in value.get('output', []) for c in o.get('content', []) if c.get('type') == 'output_text')

def test_connection():
    try:
        output = response_text('Reply with exactly OK.', 'Connection test', 16)
    except (OSError, ValueError) as error:
        if isinstance(error, OSError):
            raise ValueError('Local API key file is missing or unreadable.') from None
        raise
    if output.strip() != 'OK':
        raise ValueError('Unexpected connection-test response. Runtime AI remains disabled.')

def analyse(export):
    schema = export['expected_output']
    text = response_text(export['analysis_prompt'] + '\nReturn only JSON. Match this structure: ' + json.dumps(schema),
        json.dumps({'run_id': export['run_id'], 'input_hash': export['input_hash'], 'items': export['items']}, ensure_ascii=False))
    try:
        return json.loads(text)
    except ValueError:
        raise ValueError('OpenAI returned invalid JSON. No analysis was saved; use manual import or retry.') from None
