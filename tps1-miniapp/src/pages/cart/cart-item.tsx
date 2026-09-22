import { useAddToCart } from "@/hooks";
import { CartItem as CartItemProps } from "@/types";
import { formatPrice } from "@/utils/format";
import { animated, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { useSetAtom } from "jotai";
import { cartState } from "@/state";
import { useEffect, useState } from "react";
import { Icon } from "zmp-ui";
import QuantityInput from "@/components/quantity-input";

const SWIPE_TO_DELTE_OFFSET = 80;

export default function CartItem(props: CartItemProps) {
  const [quantity, setQuantity] = useState(props.quantity);
  const [note, setNote] = useState(props.note || "");
  const { addToCart } = useAddToCart(props.product);
  const setCart = useSetAtom(cartState);

  // update cart quantity
  useEffect(() => {
    addToCart(quantity);
  }, [quantity]);

  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    setCart((items) =>
      items.map((it) =>
        it.product.id === props.product.id ? { ...it, note: newNote } : it
      )
    );
  };

  // swipe left to delete animation
  const [{ x }, api] = useSpring(() => ({ x: 0 }));
  const bind = useDrag(
    ({ last, offset: [ox] }) => {
      if (last) {
        if (ox < -SWIPE_TO_DELTE_OFFSET) {
          api.start({ x: -SWIPE_TO_DELTE_OFFSET });
        } else {
          api.start({ x: 0 });
        }
      } else {
        api.start({ x: Math.min(ox, 0), immediate: true });
      }
    },
    {
      from: () => [x.get(), 0],
      axis: "x",
      bounds: { left: -100, right: 0, top: 0, bottom: 0 },
      rubberband: true,
      preventScroll: true,
    }
  );

  return (
    <div className="relative after:border-b-[0.5px] after:border-black/10 after:absolute after:left-[88px] after:right-0 after:bottom-0 last:after:hidden">
      <div className="absolute right-0 top-0 bottom-0 w-20 py-px">
        <div
          className="bg-danger text-white/95 w-full h-full flex flex-col space-y-1 justify-center items-center cursor-pointer"
          onClick={() => addToCart(0)}
        >
          <Icon icon="zi-delete" />
          <div className="text-2xs font-medium">Xoá</div>
        </div>
      </div>

      <animated.div
        {...bind()}
        style={{ x }}
        className="bg-white p-3.5 space-y-2 relative"
      >
        <div className="flex items-center space-x-3">
          <img src={props.product.image} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-background" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="text-sm font-medium truncate">{props.product.name}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-sm font-bold text-primary">
                {formatPrice(props.product.price)}
              </div>
              {props.product.originalPrice && props.product.originalPrice > props.product.price && (
                <div className="line-through text-subtitle text-4xs">
                  {formatPrice(props.product.originalPrice)}
                </div>
              )}
            </div>
          </div>
          <div className="w-28 flex-shrink-0">
            <QuantityInput
              value={quantity}
              onChange={(val) => setQuantity(val)}
              minValue={0}
              step={0.5}
            />
          </div>
        </div>
        <div className="pt-0.5">
          <input
            type="text"
            placeholder="Ghi chú dòng hàng (vd: cắt khúc, chia 2 túi...)"
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            className="w-full text-2xs bg-background/80 border border-black/5 rounded-lg px-2.5 py-1 text-subtitle focus:outline-none focus:border-primary/50"
          />
        </div>
      </animated.div>
    </div>
  );
}
