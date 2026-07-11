import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type Dexie from "dexie";
import { supabase, type Box } from "../supabase";

interface SearchInventoryProps {
  cache: {
    boxes: Dexie.Table<Box, string>;
  };
  selectedGroupId: string;
}

export const SearchInventory: React.FC<SearchInventoryProps> = ({
  cache,
  selectedGroupId,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [saving, setSaving] = useState(false);

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
    await supabase.from("boxes").update({ deleted_at: now }).eq("id", box.id);
    await cache.boxes.update(box.id, { deleted_at: now });
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

  return (
    <div>
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
        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
      />

      {selectedBox ? (
        <div className="max-w-lg">
          <button
            onClick={() => setSelectedBox(null)}
            className="mb-4 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            &larr; {t("search.back_to_results")}
          </button>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                {t("search.box_id")}
              </span>
              <p className="font-mono text-sm text-gray-900 break-all mt-0.5">
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

            {!selectedBox.deleted_at && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleDelete(selectedBox)}
                  disabled={saving}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                >
                  {t("search.move_to_bin")}
                </button>
              </div>
            )}
            {selectedBox.deleted_at && (
              <p className="text-xs text-red-400 pt-2 border-t border-gray-100">
                {t("search.in_bin")}
              </p>
            )}
          </div>
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
                className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-gray-900 truncate">
                      {box.id}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {box.side} &middot; {t("search.level")} {box.level}
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
