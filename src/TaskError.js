import React from "react";

export default function TaskError({ error, listError, listErrorOpen, setListErrorOpen }) {
  // タスク追加モーダル用エラー（error: 文字列または配列）
  if (error) {
    return (
      <div className="text-red-600 text-sm mb-1">
        {Array.isArray(error)
          ? error.map((err, idx) => <div key={idx}>・{err}</div>)
          : error}
      </div>
    );
  }

  // リスト編集時エラー（listError, listErrorOpen）
  if (listError) {
    if (!listErrorOpen) {
      return <div className="text-red-600 text-sm mb-2">{listError}</div>;
    }
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: "rgba(0,0,0,0.2)" }}
        onClick={() => setListErrorOpen(false)}
      >
        <div
          className="bg-white border border-red-400 text-red-600 px-6 py-4 rounded shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <b>入力エラー:</b>
          <div>{listError}</div>
          <button className="mt-2 px-4 py-1 bg-red-500 text-white rounded" onClick={() => setListErrorOpen(false)}>
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return null;
}