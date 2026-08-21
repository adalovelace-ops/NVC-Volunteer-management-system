import { AppRegistry } from 'react-native';
import App from '../App';
import './web.css';

const appName = 'NVC';
const rootTag = document.getElementById('root');

if (!rootTag) {
  throw new Error('Missing #root element.');
}

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, { rootTag });
