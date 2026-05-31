import { CommonActions } from "@react-navigation/native";

/** Переход на форму отзыва по заказу из чата или карточки заказа */
export function openReviewFromChat(navigation, orderId) {
  if (!navigation || orderId == null) return;

  const params = { orderId: String(orderId), openReviewForm: true };

  navigation.dispatch(
    CommonActions.navigate({
      name: "Main",
      params: {
        screen: "Отзывы",
        params
      }
    })
  );
}

export function handleChatMessageAction(navigation, action, { role } = {}) {
  if (!action || action.type !== "review" || !action.order_id) return;
  if (role !== "client") return;
  openReviewFromChat(navigation, action.order_id);
}
