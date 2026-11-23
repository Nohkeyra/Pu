import { useNativeBackButton } from '@/hooks/native/useNativeBackButton';

function NativeBackButtonHandler({ isWelcomeActive = false }: { isWelcomeActive?: boolean }) {
  useNativeBackButton(isWelcomeActive);
  return null;
}

export default NativeBackButtonHandler;
