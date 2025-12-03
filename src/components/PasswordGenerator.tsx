import { useState, useEffect } from 'react';
import { useNotifications } from './NotificationSystem';
import Button from './Button/Button';
// import Input from './Input/Input';

interface PasswordGeneratorProps {
  onPasswordGenerated: (password: string) => void;
  onClose: () => void;
}

export default function PasswordGenerator({ onPasswordGenerated, onClose }: PasswordGeneratorProps) {
  const { addNotification } = useNotifications();
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [length, setLength] = useState(16);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeSimilar, setExcludeSimilar] = useState(true);

  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const similar = 'il1Lo0O';

    let charset = '';
    if (useUppercase) charset += uppercase;
    if (useLowercase) charset += lowercase;
    if (useNumbers) charset += numbers;
    if (useSymbols) charset += symbols;

    if (charset === '') {
      addNotification({
        type: 'warning',
        title: 'Предупреждение',
        message: 'Выберите хотя бы один тип символов'
      });
      return;
    }

    if (excludeSimilar) {
      charset = charset.split('').filter(char => !similar.includes(char)).join('');
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    setGeneratedPassword(password);
  };

  const copyToClipboard = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      addNotification({
        type: 'success',
        title: 'Пароль скопирован',
        message: 'Пароль скопирован в буфер обмена',
        duration: 2000
      });
    }
  };

  const usePassword = () => {
    if (generatedPassword) {
      onPasswordGenerated(generatedPassword);
      onClose();
    }
  };

  useEffect(() => {
    generatePassword();
  }, [length, useUppercase, useLowercase, useNumbers, useSymbols, excludeSimilar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="bg-[#1f1f1f] rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Генератор паролей</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✖
          </button>
        </div>

        <div className="space-y-4">
          {/* Сгенерированный пароль */}
          <div className="bg-[#2b2b2b] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-400 text-sm mb-1">Сгенерированный пароль:</p>
                <p className="text-white font-mono text-lg break-all">{generatedPassword}</p>
              </div>
              <Button onClick={copyToClipboard} className="ml-2 text-xs">
                Копировать
              </Button>
            </div>
          </div>

          {/* Настройки */}
          <div className="space-y-3">
            <div>
              <label className="text-gray-300 text-sm">Длина пароля: {length}</label>
              <input
                type="range"
                min="8"
                max="64"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value))}
                className="w-full h-2 bg-[#2b2b2b] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useUppercase}
                  onChange={(e) => setUseUppercase(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-300">Заглавные буквы (A-Z)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useLowercase}
                  onChange={(e) => setUseLowercase(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-300">Строчные буквы (a-z)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useNumbers}
                  onChange={(e) => setUseNumbers(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-300">Цифры (0-9)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useSymbols}
                  onChange={(e) => setUseSymbols(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-300">Символы (!@#$%^&*)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excludeSimilar}
                  onChange={(e) => setExcludeSimilar(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-300">Исключить похожие символы (il1Lo0O)</span>
              </label>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-4">
            <Button onClick={generatePassword} className="flex-1">
              Сгенерировать заново
            </Button>
            <Button onClick={usePassword} className="flex-1" disabled={!generatedPassword}>
              Использовать
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 