import React from "react";

export default function CategorySelectModal({
  categories, categoryInput, setCategoryInput,
  selectedCategory, setSelectedCategory,
  setTab, setShowCategoryModal, setIsLoggedIn
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-96" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg mb-4">分類を選択してください</h2>
        <div className="mb-2">
          <label className="block mb-1">新しい分類名を入力:</label>
          <input
            type="text"
            className="w-full border p-1 mb-2"
            value={categoryInput}
            onChange={e => {
              setCategoryInput(e.target.value);
              setSelectedCategory("");
            }}
            placeholder="例: 仕事, プライベート など"
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1">既存の分類から選択:</label>
          <select
            className="w-full border p-1"
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setCategoryInput("");
            }}
          >
            <option value="">-- 選択しない --</option>
            {categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => {
              let cat = categoryInput.trim();
              if (cat) {
                if (!categories.includes(cat)) {
                  // 新しい分類なら追加
                  setTab(cat);
                }
              } else if (selectedCategory && selectedCategory.trim()) {
                setTab(selectedCategory);
              } else {
                setTab("未仕分け");
              }
              setShowCategoryModal(false);
              setIsLoggedIn(true);
              setCategoryInput("");
              setSelectedCategory("");
            }}
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
}