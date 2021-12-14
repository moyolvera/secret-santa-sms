import React from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Toast, {
  ToastProvider,
  useToast
} from 'react-native-toast-notifications';
import LottieView from 'lottie-react-native';
import * as SendSMS from 'react-native-sms';
import { check, PERMISSIONS, RESULTS, request } from 'react-native-permissions';

function shuffle(data: PeopleItem[]) {
  return data.sort(() => Math.random() - 0.5);
}

type FabProps = {
  data: PeopleItem[];
};

const Fab = ({ data }: FabProps) => {
  const toast = useToast();
  const toastRef = React.useRef<Toast>(null);
  const [modalVisible, setModalVisible] = React.useState(false);

  const [status, setStatus] = React.useState('');

  function onStartMatching() {
    if (data.length === 0) {
      toast.show('Please add people to the list', {
        duration: 5000,
        placement: 'top',
        type: 'danger'
      });
      return;
    }

    if (data.length < 3) {
      toast.show('You need at least 3 people', {
        duration: 5000,
        placement: 'top',
        type: 'danger'
      });
      return;
    }

    setModalVisible(true);
    setStatus('Santa is working!');

    startSecretSanta();
  }

  async function startSecretSanta() {
    setStatus('Shuffling all the items!');

    const shuffledPeople = shuffle(data);

    const results: { santa: PeopleItem; recipient: PeopleItem }[] = [];

    setStatus('Creating the secret santa!');

    for (let i = 0; i < shuffledPeople.length; i++) {
      const santa = shuffledPeople[i];
      let recipient: PeopleItem;

      if (i !== shuffledPeople.length - 1) {
        recipient = shuffledPeople[i + 1];
      } else {
        recipient = shuffledPeople[0];
      }

      results.push({ santa: santa, recipient: recipient });
    }

    setStatus('Preparing to notify!');

    for (const result of results) {
      await new Promise<void>(resolve => {
        console.log('notify to ', result.recipient.phone);

        SendSMS.send(
          {
            body: `Hola ${result.santa.name}, has sido elegid@ para darle regalo a ${result.recipient.name} en la proxima navidad!`,
            recipients: [result.santa.phone],
            // @ts-ignore-line
            successTypes: ['sent', 'queued'],
            allowAndroidSendWithoutReadPermission: true,
            directSend: true
          },
          (completed, cancelled, error) => {
            console.log('send sms to: ', result.santa.phone);
            console.log({ completed, cancelled, error });

            if (completed) {
              toastRef.current?.show(`${result.santa.name} has been notified!`);
            } else if (cancelled) {
              toastRef.current?.show(
                `${result.santa.name} hasn't been notified. Reason: Cancelled by user!`
              );
            } else if (error) {
              toastRef.current?.show(
                `${result.santa.name} hasn't been notified. Reason: Something failed!`
              );
            }

            resolve();
          }
        );
      });
    }

    setStatus('All done. Happy holidays!');
  }

  React.useEffect(() => {
    if (modalVisible) {
      toastRef.current?.show(status, {
        duration: 3000,
        placement: 'top',
        type: 'success'
      });
    }
  }, [status]);

  return (
    <>
      <TouchableOpacity style={style.fab} onPress={onStartMatching}>
        <View style={style.triangle} />
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <Toast ref={toastRef} />
        <View style={style.modal}>
          <LottieView source={require('./santa.json')} autoPlay loop />
          <Text style={style.status}>{status}</Text>
        </View>
      </Modal>
    </>
  );
};

type PeopleItem = {
  name: string;
  phone: string;
};

type PeopleItemProps = {
  item: PeopleItem;
  onPress: (index: number) => void;
};

const People = ({ item, onPress }: PeopleItemProps) => {
  const { name, phone } = item;
  return (
    <View style={style.people}>
      <View style={style.santa}>
        <Image
          source={{
            uri: 'https://icons-for-free.com/iconfiles/png/512/claus+santa+icon-1320168081320408044.png'
          }}
          style={style.image}
        />
      </View>
      <View style={style.flex}>
        <Text style={style.bold}>{name}</Text>
        <Text>{phone.replace(/^.{7}/g, '*******')}</Text>
      </View>
      <TouchableOpacity onPress={() => onPress(0)}>
        <View style={style.deleteWrapper}>
          <Text style={style.delete}>X</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

type InputProps = {
  onSavePeople: (name: string, phone: string) => void;
};

const Input = ({ onSavePeople }: InputProps) => {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [error, setError] = React.useState('');

  const nameRef = React.useRef<TextInput>(null);
  const phoneRef = React.useRef<TextInput>(null);

  function onSave() {
    if (name.length === 0) {
      setError('Please enter a name');
      nameRef.current?.focus();
      return;
    }

    if (phone.length != 10) {
      setError('Please enter a valid phone number');

      const isFocused = phoneRef.current?.isFocused();
      if (!isFocused) {
        phoneRef.current?.focus();
      }

      return;
    }

    setError('');

    onSavePeople(name, phone);
    setName('');
    setPhone('');
  }

  function handleOnSubmitName() {
    phoneRef.current?.focus();
  }

  function handleOnSubmitPhone() {
    onSave();
  }

  return (
    <View style={style.input}>
      {!!error && <Text style={style.error}>{error}</Text>}
      <Text style={style.bold}>Name</Text>
      <TextInput
        ref={nameRef}
        style={style.inputText}
        placeholder="Enter the Name"
        placeholderTextColor="#808A9F"
        value={name}
        onChangeText={setName}
        blurOnSubmit
        onSubmitEditing={handleOnSubmitName}
      />
      <Text style={style.bold}>Phone</Text>
      <TextInput
        ref={phoneRef}
        style={style.inputText}
        placeholder="Enter the Phone Number"
        placeholderTextColor="#808A9F"
        value={phone}
        onChangeText={setPhone}
        blurOnSubmit
        onSubmitEditing={handleOnSubmitPhone}
        keyboardType="number-pad"
      />
      <TouchableOpacity onPress={onSave}>
        <Text style={style.button}>Add</Text>
      </TouchableOpacity>
    </View>
  );
};

const Container = () => {
  const [people, setPeople] = React.useState<PeopleItem[]>([
    { name: 'John', phone: '1234567890' }
  ]);

  function savePeople(name: string, phone: string) {
    setPeople([...people, { name, phone }]);
  }

  function removePeople(index: number) {
    setPeople(people.filter((_, i) => i !== index));
  }

  React.useEffect(() => {
    check(PERMISSIONS.ANDROID.SEND_SMS).then(result => {
      if (result !== RESULTS.GRANTED) {
        request(PERMISSIONS.ANDROID.SEND_SMS).then(result => {
          if (result !== RESULTS.GRANTED) {
            Alert.alert(
              'Permission Required',
              'Please enable SMS permission in your settings.',
              [
                {
                  text: 'Cancel',
                  onPress: () => {},
                  style: 'cancel'
                },
                { text: 'OK', onPress: () => Linking.openSettings() }
              ],
              { cancelable: false }
            );
          }
        });
      }
    });
  }, []);

  return (
    <>
      <SafeAreaView style={style.background}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFEC" />
        <ScrollView style={style.wrapper}>
          <View style={style.marginList}>
            <Text style={style.title}>Secret Santa</Text>
            <Text style={style.subtitle}>
              Add the people who is participating on secret santa and I will
              notify them via SMS
            </Text>
            <Input onSavePeople={savePeople} />
            {people.length === 0 ? (
              <Text style={style.subtitle}>
                You need to add people to start the Secret Santa
              </Text>
            ) : (
              <Text style={style.subtitle}>
                You have added {people.length} people
              </Text>
            )}
            <FlatList
              data={people}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <People item={item} onPress={removePeople} />
              )}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
      <Fab data={people} />
    </>
  );
};

const App = () => {
  return (
    <ToastProvider>
      <Container />
    </ToastProvider>
  );
};

const style = StyleSheet.create({
  background: {
    backgroundColor: '#FFFFEC',
    flex: 1
  },
  flex: {
    flex: 1
  },
  bold: {
    fontWeight: 'bold'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20
  },
  wrapper: {
    padding: 20
  },
  people: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    alignItems: 'center'
  },
  santa: {
    width: 60
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  input: {
    marginBottom: 20
  },
  inputText: {
    width: '50%',
    padding: 10,
    color: '#3B7080'
  },
  button: {
    backgroundColor: '#41D3BD',
    padding: 10,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 20
  },
  error: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#41D3BD',
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 20,
    borderRadius: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
    top: 2,
    left: 4,
    transform: [{ rotate: '90deg' }]
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
  },
  loading: {
    width: 120,
    height: 120,
    backgroundColor: 'red'
  },
  deleteWrapper: {
    width: 22,
    height: 22,
    borderRadius: 25,
    borderColor: 'red',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  delete: {
    fontWeight: 'bold',
    color: 'red',
    fontSize: 12
  },
  marginList: {
    marginBottom: 40
  },
  status: {
    fontSize: 22,
    position: 'absolute',
    color: '#fff',
    fontWeight: 'bold',
    bottom: 200
  }
});

export default App;
