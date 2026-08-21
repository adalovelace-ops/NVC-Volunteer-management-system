import glyphMap from 'react-native-vector-icons/glyphmaps/MaterialIcons.json';
// @ts-ignore
import fontFile from 'react-native-vector-icons/Fonts/MaterialIcons.ttf';
import { createIconSet } from './createIconSet';

export default createIconSet(glyphMap, 'MaterialIcons', fontFile);
