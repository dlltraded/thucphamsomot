import TransitionLink from "@/components/transition-link";
import { useAtomValue } from "jotai";
import { categoriesState } from "@/state";

export default function CategoryListPage() {
  const categories = useAtomValue(categoriesState);

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {categories.map((category) => (
        <TransitionLink
          key={category.id}
          className="flex flex-col items-center bg-background rounded-xl p-3 shadow-[0_10px_24px_#0D0D0D17]"
          to={`/category/${category.id}`}
        >
          <div className="w-16 h-16 rounded-full overflow-hidden bg-section mb-2">
             <img src={category.image} className="w-full h-full object-cover" />
          </div>
          <div className="text-sm font-medium text-primary text-center">
            {category.name}
          </div>
        </TransitionLink>
      ))}
    </div>
  );
}
