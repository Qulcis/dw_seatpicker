export async function onRequest(context) {
    const { request, env } = context;
    const method = request.method;
    const url = new URL(request.url);

    // 1. GET: 회차 목록 또는 특정 회차 번호 데이터 조회
    if (method === 'GET') {
        try {
            const isListOnly = url.searchParams.get('list') === 'true';
            const recordId = url.searchParams.get('id');

            // 회차 목록만 조회 (드롭다운 목록용)
            if (isListOnly) {
                const { results } = await env.DB.prepare(
                    "SELECT id, created_at FROM seat_history ORDER BY id DESC"
                ).all();

                return new Response(JSON.stringify({ success: true, records: results }), {
                    headers: { 'Content-Type': 'application/json; charset=utf-8' }
                });
            }

            // 특정 회차(또는 가장 최근 회차) 조회
            let query = "SELECT * FROM seat_history ORDER BY id DESC LIMIT 1";
            let params = [];

            if (recordId) {
                query = "SELECT * FROM seat_history WHERE id = ?";
                params = [recordId];
            }

            const record = await env.DB.prepare(query).bind(...params).first();

            if (!record) {
                return new Response(JSON.stringify({ success: false, message: "저장된 기록이 없습니다." }), { status: 404 });
            }

            return new Response(JSON.stringify({
                success: true,
                recordId: record.id,
                layout: JSON.parse(record.layout_data),
                createdAt: record.created_at
            }), {
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
        }
    }

    // 2. POST: 현재 번호 배열을 DB에 바로 저장
    if (method === 'POST') {
        try {
            const body = await request.json();
            const { layout } = body;

            if (!layout || !Array.isArray(layout)) {
                return new Response(JSON.stringify({ success: false, message: "유효하지 않은 데이터입니다." }), { status: 400 });
            }

            // layout_data 하나만 INSERT
            const result = await env.DB.prepare(
                "INSERT INTO seat_history (layout_data) VALUES (?)"
            ).bind(JSON.stringify(layout)).run();

            return new Response(JSON.stringify({
                success: true,
                message: "성공적으로 저장되었습니다.",
                recordId: result.meta.last_row_id
            }), {
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
        }
    }

    return new Response("Method Not Allowed", { status: 405 });
}