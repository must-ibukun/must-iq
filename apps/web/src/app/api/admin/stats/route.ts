import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        ok: true,
        stats: {
            chunks: 27543,
            users: 148,
            tokensToday: 841000,
            autoIngested: 312
        }
    });
}
