import 'react-native';

// react-native-web translates this prop to HTML data attributes.
declare module 'react-native' {
  interface ViewProps { dataSet?: Record<string, string | boolean | undefined> }
}
