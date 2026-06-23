import TransitionLink from "@/components/transition-link";
import { useAtomValue } from "jotai";
import { categoriesState } from "@/state";

export default function Category() {
  const categories = useAtomValue(categoriesState);

  return (
    <div className="bg-white p-4">
      <div className="grid grid-cols-4 gap-4">
        {categories.slice(0, 8).map((category, i) => (
          <TransitionLink
            key={category.id}
            to={`/category/${category.id}`}
            className="flex flex-col items-center space-y-2"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden">
               <img className="w-full h-full object-cover" src={category.image} />
            </div>
            <span className="text-[10px] text-center font-medium leading-tight text-primary">
              {category.name}
            </span>
          </TransitionLink>
        ))}
      </div>
    </div>
  );
}
