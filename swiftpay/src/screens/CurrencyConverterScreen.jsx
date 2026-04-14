// swiftpay/src/screens/CurrencyConverterScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingSpinner, LoadingOverlay } from '../components/Loading';
import { ErrorState } from '../components/Empty';
import currencyService from '../services/currencyService';

const CurrencyConverterScreen = () => {
  const { colors } = useTheme();
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const supported = await currencyService.getSupportedCurrencies();
      setCurrencies(supported);
    } catch (err) {
      setError('Failed to load currencies');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const result = await currencyService.convertCurrency(
        parseFloat(amount),
        fromCurrency,
        toCurrency
      );

      setConvertedAmount(result.amount);
      setRate(result.rate);
    } catch (err) {
      setError(err.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  if (loading && currencies.length === 0) {
    return <LoadingSpinner message="Loading currencies..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Currency Converter
        </Text>

        {error && (
          <Card style={{ borderColor: colors.danger }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </Card>
        )}

        <Card>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            From
          </Text>
          <TouchableOpacity onPress={() => setShowFromPicker(!showFromPicker)}>
            <View
              style={[
                styles.currencySelector,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                {fromCurrency}
              </Text>
            </View>
          </TouchableOpacity>

          {showFromPicker && (
            <View style={styles.picker}>
              {currencies.slice(0, 10).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  onPress={() => {
                    setFromCurrency(curr);
                    setShowFromPicker(false);
                  }}
                  style={styles.pickerItem}
                >
                  <Text
                    style={{
                      color:
                        curr === fromCurrency
                          ? colors.primary
                          : colors.textPrimary,
                      fontSize: 14,
                    }}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Input
            label="Amount"
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </Card>

        <Button
          title="↕️ Swap Currencies"
          onPress={swapCurrencies}
          variant="outline"
          style={{ marginHorizontal: 16 }}
        />

        <Card>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            To
          </Text>
          <TouchableOpacity onPress={() => setShowToPicker(!showToPicker)}>
            <View
              style={[
                styles.currencySelector,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                {toCurrency}
              </Text>
            </View>
          </TouchableOpacity>

          {showToPicker && (
            <View style={styles.picker}>
              {currencies.slice(0, 10).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  onPress={() => {
                    setToCurrency(curr);
                    setShowToPicker(false);
                  }}
                  style={styles.pickerItem}
                >
                  <Text
                    style={{
                      color:
                        curr === toCurrency
                          ? colors.primary
                          : colors.textPrimary,
                      fontSize: 14,
                    }}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        <Button
          title="Convert"
          onPress={handleConvert}
          loading={loading}
          fullWidth
          style={{ marginHorizontal: 16, marginVertical: 16 }}
        />

        {convertedAmount !== null && (
          <Card style={{ borderColor: colors.success }}>
            <View style={styles.resultContainer}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                Result
              </Text>
              <Text style={[styles.resultValue, { color: colors.success }]}>
                {convertedAmount} {toCurrency}
              </Text>
              <Text style={[styles.rateText, { color: colors.textTertiary }]}>
                Rate: 1 {fromCurrency} = {rate?.toFixed(4)} {toCurrency}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      <LoadingOverlay visible={loading} message="Converting..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  currencySelector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: {
    borderRadius: 8,
    marginBottom: 12,
    maxHeight: 150,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resultLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  rateText: {
    fontSize: 12,
    marginTop: 8,
  },
});

export default CurrencyConverterScreen;
