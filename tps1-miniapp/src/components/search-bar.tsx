import { keywordState } from "@/state";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "zmp-ui";
import { InputProps } from "zmp-ui/input";

const SearchBar = (props: InputProps) => {
  const [localKeyword, setLocalKeyword] = useState("");
  const [keyword, setKeyword] = useAtom(keywordState);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/search" && inputRef.current) {
      inputRef.current.focus();
    }
    return () => {
      setKeyword("");
    };
  }, [location]);

  // Tìm kiếm tức thời nhưng chờ người dùng ngừng gõ một nhịp để không gọi API
  // cho từng phím. Hai ký tự trở lên đủ để trả gợi ý có ý nghĩa.
  useEffect(() => {
    const normalized = localKeyword.trim();
    const timer = window.setTimeout(() => {
      setKeyword(normalized.length >= 2 ? normalized : "");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [localKeyword, setKeyword]);

  return (
    <Input.Search
      size="small"
      placeholder="Bạn muốn mua gì..."
      className="border-none outline-none m-0"
      style={{
        viewTransitionName: "search-bar",
      }}
      value={localKeyword}
      onChange={(e) => setLocalKeyword(e.currentTarget.value)}
      onKeyUp={(e) => {
        if (e.key === "Enter") {
          setKeyword(localKeyword);
        }
      }}
      onBlur={() => setKeyword(localKeyword)}
      clearable
      {...props}
    />
  );
};

export default SearchBar;
