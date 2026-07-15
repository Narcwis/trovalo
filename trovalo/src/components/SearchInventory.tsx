import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type Dexie from "dexie";
import { supabase, type Box } from "../supabase";
import { boxNumber } from "../lib/box-number";
import { enqueue } from "../sync-queue";

interface SearchInventoryProps {
  cache: {
    boxes: Dexie.Table<Box, string>;
  };
  selectedGroupId: string;
  onBack: () => void;
  groupNames: Record<string, string>;
  isAdmin: boolean;
}

export const SearchInventory: React.FC<SearchInventoryProps> = ({
  cache,
  selectedGroupId,
  onBack,
  groupNames,
  isAdmin,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSide, setEditSide] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editItems, setEditItems] = useState<string[]>([]);
  const [editItemInput, setEditItemInput] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    cache.boxes
      .filter((box) => {
        if (box.deleted_at) return false;
        if (selectedGroupId && box.group_id !== selectedGroupId) return false;
        return (
          box.side.toLowerCase().includes(q) ||
          box.level.toLowerCase().includes(q) ||
          box.id.toLowerCase().includes(q) ||
          (box.items || []).some((item) => item.toLowerCase().includes(q))
        );
      })
      .toArray()
      .then((boxes) => {
        boxes.sort((a, b) => b.updated_at - a.updated_at);
        setResults(boxes);
      });
  }, [query, cache.boxes, selectedGroupId]);

  const handleDelete = async (box: Box) => {
    setSaving(true);
    const now = new Date().toISOString();
    await cache.boxes.update(box.id, { deleted_at: now });
    const { error: err } = await supabase
      .from("boxes")
      .update({ deleted_at: now })
      .eq("id", box.id);
    if (err) console.warn("Supabase delete failed, updated locally:", err.message);
    await enqueue("softDelete", box.id);
    setSelectedBox({ ...box, deleted_at: now });
    setSaving(false);
    loadResults();
  };

  const loadResults = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    cache.boxes
      .filter((box) => {
        if (box.deleted_at) return false;
        if (selectedGroupId && box.group_id !== selectedGroupId) return false;
        return (
          box.side.toLowerCase().includes(q) ||
          box.level.toLowerCase().includes(q) ||
          box.id.toLowerCase().includes(q) ||
          (box.items || []).some((item) => item.toLowerCase().includes(q))
        );
      })
      .toArray()
      .then((boxes) => {
        boxes.sort((a, b) => b.updated_at - a.updated_at);
        setResults(boxes);
      });
  };

  const startEditing = (box: Box) => {
    setEditSide(box.side);
    setEditLevel(box.level);
    setEditItems([...box.items]);
    setEditItemInput("");
    setEditing(true);
  };

  const handleEditSave = async () => {
    if (!selectedBox || !editSide.trim() || !editLevel.trim()) return;
    setSaving(true);
    const updated: Box = {
      ...selectedBox,
      side: editSide.trim(),
      level: editLevel.trim(),
      items: editItems,
      updated_at: Date.now(),
    };
    // Always save locally
    await cache.boxes.put(updated);
    // Try to sync to Supabase
    const { error: err } = await supabase
      .from("boxes")
      .upsert(updated, { onConflict: "id" });
    if (err) {
      console.warn("Supabase save failed, saved locally:", err.message);
      await enqueue("upsert", updated.id, updated);
    }
    setSelectedBox(updated);
    setSaving(false);
    setEditing(false);
    loadResults();
  };

  const startView = () => {
    setEditing(false);
    setSelectedBox(null);
  };

  const backToHome = () => {
    setEditing(false);
    setSelectedBox(null);
    onBack();
  };

  return (
    <div>
      {!selectedBox ? (
        <>
          <button
            onClick={backToHome}
            className="mb-4 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("nav.back_to_home")}
          </button>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("search.title")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t("search.description")}</p>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedBox(null);
            }}
            placeholder={t("search.placeholder")}
            autoFocus
            className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
          />
        </>
      ) : null}

      {selectedBox ? (
        <div className="max-w-lg">
          <button
            onClick={startView}
            className="mb-4 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("search.back_to_results")}
          </button>

          {editing ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("search.side")}
                </label>
                <input
                  type="text"
                  value={editSide}
                  onChange={(e) => setEditSide(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("search.level")}
                </label>
                <input
                  type="text"
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("search.contents")}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editItemInput}
                    onChange={(e) => setEditItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = editItemInput.trim();
                        if (v && !editItems.includes(v)) {
                          setEditItems([...editItems, v]);
                          setEditItemInput("");
                        }
                      }
                    }}
                    placeholder={t("search.item_placeholder")}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      const v = editItemInput.trim();
                      if (v && !editItems.includes(v)) {
                        setEditItems([...editItems, v]);
                        setEditItemInput("");
                      }
                    }}
                    disabled={!editItemInput.trim()}
                    className="px-4 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {t("search.add_item")}
                  </button>
                </div>
                {editItems.length > 0 && (
                  <ul className="space-y-1">
                    {editItems.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm"
                      >
                        <span className="text-gray-700">{item}</span>
                        <button
                          onClick={() => setEditItems(editItems.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t("search.cancel")}
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editSide.trim() || !editLevel.trim() || saving}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? t("search.saving") : t("search.save")}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {t("search.box_number")}
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  #{boxNumber(selectedBox.id)}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                  {selectedBox.id}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    {t("search.side")}
                  </span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedBox.side}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    {t("search.level")}
                  </span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedBox.level}
                  </p>
                </div>
              </div>
              {isAdmin && selectedBox.group_id && groupNames[selectedBox.group_id] && (
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    {t("search.group")}
                  </span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {groupNames[selectedBox.group_id]}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {t("search.contents")}
                </span>
                {selectedBox.items && selectedBox.items.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {selectedBox.items.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-700 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-0.5">
                    {t("search.empty")}
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                {!selectedBox.deleted_at && (
                  <button
                    onClick={() => startEditing(selectedBox)}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {t("search.edit")}
                  </button>
                )}
                {!selectedBox.deleted_at && (
                  <button
                    onClick={() => handleDelete(selectedBox)}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {t("search.move_to_bin")}
                  </button>
                )}
                {selectedBox.deleted_at && (
                  <p className="text-xs text-red-400 pt-2 border-t border-gray-100">
                    {t("search.in_bin")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : query.trim() ? (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-8 text-center">
              {t("search.no_results")}
            </p>
          ) : (
            results.map((box) => (
              <button
                key={box.id}
                onClick={() => setSelectedBox(box)}
                className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900">
                      #{boxNumber(box.id)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {box.side} &middot; {t("search.level")} {box.level}
                      {isAdmin && box.group_id && groupNames[box.group_id] && (
                        <> &middot; {groupNames[box.group_id]}</>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {(box.items || []).length}{" "}
                    {(box.items || []).length === 1
                      ? t("search.item_count")
                      : t("search.item_count_plural")}
                  </span>
                </div>
                {box.items && box.items.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {box.items.slice(0, 3).join(", ")}
                    {box.items.length > 3 && "..."}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
