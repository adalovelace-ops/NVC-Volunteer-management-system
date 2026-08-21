import glyphMap from 'react-native-vector-icons/glyphmaps/Ionicons.json';
// @ts-ignore
import fontFile from 'react-native-vector-icons/Fonts/Ionicons.ttf';
import { createIconSet } from './createIconSet';

export default createIconSet(glyphMap, 'Ionicons', fontFile);
