import { useNativeBackButton } from '@/hooks/native/useNativeBackButton';

function NativeBackButtonHandler() {
  useNativeBackButton();
  return null;
}

export default NativeBackButtonHandler;
