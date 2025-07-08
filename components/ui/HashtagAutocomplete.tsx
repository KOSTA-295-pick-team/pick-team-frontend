import React, { useState, useEffect, useRef } from "react";
import { userControllerApi } from "../../services/user-controller";
import {
  validateHashtag,
  normalizeHashtag,
  debounce,
} from "../../utils/hashtag";

interface HashtagAutocompleteProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  disabled?: boolean;
}

export const HashtagAutocomplete: React.FC<HashtagAutocompleteProps> = ({
  selectedTags,
  onTagsChange,
  maxTags = 20,
  placeholder = "해시태그를 입력하세요 (최대 20개)",
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // 검색 함수에 디바운스 적용
  const debouncedSearch = useRef(
    debounce(async (keyword: string) => {
      if (keyword.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const hashtagList = await userControllerApi.searchHashtags({
          keyword: keyword.trim(),
        });

        // 이미 선택된 태그는 제외
        const filteredSuggestions = hashtagList.filter(
          (suggestion) => !selectedTags.includes(suggestion.name)
        );
        setSuggestions(filteredSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error("해시태그 검색 실패:", error);
        setError("해시태그 검색에 실패했습니다.");
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 300)
  ).current;

  // 입력값 변화 시 검색 실행
  useEffect(() => {
    debouncedSearch(inputValue);
  }, [inputValue, selectedTags, debouncedSearch]);

  const handleAddTag = (tagName: string) => {
    const normalized = normalizeHashtag(tagName);
    if (!normalized) {
      setError("유효하지 않은 해시태그입니다.");
      return;
    }

    if (selectedTags.includes(normalized)) {
      setError("이미 추가된 해시태그입니다.");
      return;
    }

    if (selectedTags.length >= maxTags) {
      setError(`해시태그는 최대 ${maxTags}개까지 등록할 수 있습니다.`);
      return;
    }

    onTagsChange([...selectedTags, normalized]);
    setInputValue("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setError(null);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter((tag) => tag !== tagToRemove));
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        // 화살표 키로 선택된 항목이 있으면 그것을 추가
        handleAddTag(suggestions[selectedIndex].name);
      } else if (inputValue.trim()) {
        // 직접 입력한 값을 추가
        const trimmedValue = inputValue.trim();
        const errors = validateHashtag(trimmedValue);

        if (errors.length === 0) {
          handleAddTag(trimmedValue);
        } else {
          setError(errors[0]);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      selectedTags.length > 0
    ) {
      // 입력값이 없을 때 백스페이스를 누르면 마지막 태그 제거
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError(null);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (suggestion: { id: number; name: string }) => {
    handleAddTag(suggestion.name);
  };

  return (
    <div className="hashtag-autocomplete relative w-full">
      {/* 선택된 태그들 표시 */}
      <div className="selected-tags flex flex-wrap gap-2 mb-3">
        {selectedTags.map((tag, index) => (
          <span
            key={index}
            className="tag inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm gap-1"
          >
            #{tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="remove-btn bg-none border-none text-blue-800 cursor-pointer text-base leading-none hover:text-blue-900 ml-1"
              aria-label={`${tag} 태그 제거`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* 입력 필드 */}
      <div className="input-container relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedTags.length >= maxTags
              ? `최대 ${maxTags}개 완료`
              : placeholder
          }
          disabled={disabled || selectedTags.length >= maxTags}
          className="hashtag-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoComplete="off"
        />

        {/* 로딩 표시 */}
        {isLoading && (
          <div className="loading text-center py-2 text-gray-500 text-xs">
            검색 중...
          </div>
        )}

        {/* 자동완성 목록 */}
        {showSuggestions && suggestions.length > 0 && !isLoading && (
          <div className="suggestions absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md max-h-48 overflow-y-auto z-50 shadow-lg mt-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`suggestion-item px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                  selectedIndex === index ? "bg-blue-50" : ""
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                #{suggestion.name}
              </div>
            ))}
          </div>
        )}

        {/* 검색 결과가 없을 때 */}
        {showSuggestions &&
          suggestions.length === 0 &&
          !isLoading &&
          inputValue.trim() && (
            <div className="suggestions absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md z-50 shadow-lg mt-1">
              <div className="px-3 py-2 text-gray-500 text-sm">
                검색 결과가 없습니다. Enter를 눌러 새 태그를 추가하세요.
              </div>
            </div>
          )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-message mt-2 text-red-600 text-xs">{error}</div>
      )}

      {/* 안내 메시지 */}
      <div className="help-text mt-2 text-gray-600 text-xs">
        <div>• 한글, 영문, 숫자, 언더스코어만 사용 가능 (2-20자)</div>
        <div>
          • 최대 {maxTags}개까지 등록 가능 ({selectedTags.length}/{maxTags})
        </div>
        <div>• Enter 키 또는 클릭으로 추가, 백스페이스로 마지막 태그 제거</div>
      </div>
    </div>
  );
};
