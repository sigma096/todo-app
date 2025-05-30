import React from "react";

export default function DeleteCategoryWarning({
  tab, setCategories, setTasks, setTab, setShowDeleteCategoryWarning
}) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      onClick={() => setShowDeleteCategoryWarning(false)}
    >
      <div
        className="bg-white p-6 rounded shadow w-96"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg mb-4 text-red-600">この分類にはタスクが残っています</h2>
        <p className="mb-4">本当にこの分類を削除しますか？<br />（分類内のタスクは「未仕分け」に移動します）</p>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            className="px-3 py-1 border rounded bg-red-400 text-white"
            onClick={() => {
              setCategories(prev => prev.filter(cat => cat !== tab));
              setTasks(tasks => tasks.map(t => t.分類 === tab ? { ...t, 分類: "未仕分け" } : t));
              setTab("未仕分け");
              setShowDeleteCategoryWarning(false);
            }}
          >削除</button>
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setShowDeleteCategoryWarning(false)}
          >キャンセル</button>
        </div>
      </div>
    </div>
  );
}