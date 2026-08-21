declare module 'react-native-vector-icons/MaterialIcons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  export interface MaterialIconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  const MaterialIcons: ComponentType<MaterialIconProps> & { glyphMap: Record<string, number> };
  export default MaterialIcons;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  export interface MaterialCommunityIconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  const MaterialCommunityIcons: ComponentType<MaterialCommunityIconProps> & { glyphMap: Record<string, number> };
  export default MaterialCommunityIcons;
}

declare module 'react-native-vector-icons/Ionicons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  export interface IoniconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  const Ionicons: ComponentType<IoniconProps> & { glyphMap: Record<string, number> };
  export default Ionicons;
}
