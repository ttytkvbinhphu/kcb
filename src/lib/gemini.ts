export async function generateGeminiContent(model: string, contents: any[], config: any = {}) {
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      contents,
      config,
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    let errorMsg = 'Failed to generate content';
    try {
      const responseText = await response.text();
      if (contentType.includes('application/json')) {
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorMsg;
        } catch (_) {
          errorMsg = responseText.substring(0, 300);
        }
      } else {
        errorMsg = `Lỗi hệ thống (${response.status}): ${responseText.substring(0, 150).replace(/<[^>]*>/g, '').trim() || response.statusText}`;
      }
    } catch (_) {
      errorMsg = `Lỗi kết nối (${response.status} ${response.statusText})`;
    }
    throw new Error(errorMsg);
  }

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Định dạng phản hồi không hợp lệ từ máy chủ: ${text.substring(0, 100)}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.text;
}
