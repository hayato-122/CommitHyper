export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return Response.json({
      available: false,
      reason: "no_key",
      message: "GEMINI_API_KEY が設定されていません",
      model: null,
    });
  }

  return Response.json({
    available: true,
    reason: null,
    message: null,
    model: "gemini-2.5-flash",
  });
}
