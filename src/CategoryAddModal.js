import React from "react";

export default function CategoryAddModal({
  newCategoryName, setNewCategoryName,
  categoryMessage, setCategoryMessage,
  categories, setCategories, setTab,
  setShowAddCategoryModal
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-96" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg mb-4">新規分類名を入力</h2>
        <input
          type="text"
          className="w-full border p-1 mb-2"
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          placeholder="新しい分類名"
        />
        {categoryMessage && (
          <div className="mb-2 text-red-600 text-sm">{categoryMessage}</div>
        )}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => {
              if (!newCategoryName.trim()) {
                setCategoryMessage("分類名を入力してください。");
                return;
              }
              if (categories.includes(newCategoryName.trim())) {
                setCategoryMessage("既に存在する分類名です。");
                return;
              }
              const newCat = newCategoryName.trim();
              setCategories(prev => [...prev, newCat]);
              setTab(newCat);
              setShowAddCategoryModal(false);
              setNewCategoryName("");
              setCategoryMessage("");
            }}
          >追加</button>
          <button
            className="px-3 py-1 border rounded"
            onClick={() => {
              setShowAddCategoryModal(false);
              setNewCategoryName("");
              setCategoryMessage("");
            }}
          >キャンセル</button>
        </div>
      </div>
    </div>
  );
}