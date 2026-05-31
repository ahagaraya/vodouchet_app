/** Переход на экран корневого Stack из вкладки Tab */
export function navigateToStack(navigation, screen, params) {
  const parent = navigation.getParent?.();
  if (parent?.navigate) {
    parent.navigate(screen, params);
    return;
  }
  navigation.navigate(screen, params);
}
