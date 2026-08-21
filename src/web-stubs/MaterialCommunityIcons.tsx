import glyphMap from 'react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';
// @ts-ignore
import fontFile from 'react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf';
import { createIconSet } from './createIconSet';

export default createIconSet(glyphMap, 'MaterialCommunityIcons', fontFile);
