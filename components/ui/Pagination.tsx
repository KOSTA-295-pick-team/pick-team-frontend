import React from "react";
import { Button } from "./Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  hasNext,
  hasPrevious,
  onPageChange,
  loading = false,
}) => {
  // 페이지 번호들을 생성하는 함수
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // 총 페이지가 5개 이하인 경우 모든 페이지 표시
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 총 페이지가 5개 초과인 경우
      let startPage = Math.max(0, currentPage - 2);
      let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

      // 시작 페이지 조정
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(0, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  if (totalPages <= 1) {
    return null; // 페이지가 1개 이하면 페이징 컨트롤을 표시하지 않음
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      {/* 아이템 정보 */}
      <div className="text-sm text-neutral-600">
        {totalElements > 0 ? (
          <>
            총 {totalElements}개 중 {startItem}-{endItem}번째 항목
          </>
        ) : (
          "항목이 없습니다"
        )}
      </div>

      {/* 페이징 버튼들 */}
      <div className="flex items-center gap-1">
        {/* 이전 페이지 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevious || loading}
          className="px-2"
        >
          이전
        </Button>

        {/* 페이지 번호 버튼들 */}
        {pageNumbers.map((pageNum) => (
          <Button
            key={pageNum}
            variant={pageNum === currentPage ? "primary" : "ghost"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
            disabled={loading}
            className="px-3"
          >
            {pageNum + 1}
          </Button>
        ))}

        {/* 다음 페이지 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext || loading}
          className="px-2"
        >
          다음
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
