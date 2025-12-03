import { useStore } from "../store";
import Icon from "./Icon/Icon";
import Button from "./Button/Button";
import { safeInvoke } from "../utils/tauriUtils";
import { useNotifications } from "./NotificationSystem";
import { useState } from "react";
import Input from "./Input/Input";

export default function ServerDetails() {
  const {
    services_by_server_by_company,
    selectedServerId,
    selectedServiceId,
    connected_services,
    handleConnectService,
    handleDisconnectService,
    setSelectedService,
  } = useStore();
  const { showNotification } = useNotifications();
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Находим выбранный сервер
  const selectedServer = selectedServerId
    ? services_by_server_by_company
        .flatMap((c) => c.servers)
        .find((s) => s.id === selectedServerId)
    : null;

  // Находим выбранный сервис из store
  const selectedService = selectedServiceId
    ? services_by_server_by_company
        .flatMap((c) => c.servers)
        .flatMap((s) => s.services)
        .find((s) => s.id === selectedServiceId)
    : null;

  const isServiceConnected = selectedServiceId
    ? connected_services.includes(selectedServiceId)
    : false;

  const handleToggleConnection = async () => {
    if (!selectedServiceId) return;

    if (!isServiceConnected) {
      handleConnectService(selectedServiceId);
      try {
        await safeInvoke("connect_service", { serviceId: selectedServiceId });
      } catch (error: any) {
        handleDisconnectService(selectedServiceId);
        showNotification({
          type: "error",
          title: "Ошибка подключения",
          message: error?.message || "Не удалось подключиться к сервису",
        });
      }
    } else {
      handleDisconnectService(selectedServiceId);
      try {
        await safeInvoke("disconnect_service", { serviceId: selectedServiceId });
      } catch (error: any) {
        showNotification({
          type: "error",
          title: "Ошибка отключения",
          message: error?.message || "Не удалось отключиться от сервиса",
        });
      }
    }
  };

  const handleSaveCredentials = async () => {
    if (!selectedServiceId || !username.trim()) {
      showNotification({
        type: "warning",
        title: "Ошибка",
        message: "Введите имя пользователя",
      });
      return;
    }

    try {
      await safeInvoke("save_service_credential", {
        serviceId: selectedServiceId,
        username,
        password: password || null,
        remember: true,
      });
      setEditingCredentials(false);
      setPassword("");
      showNotification({
        type: "success",
        title: "Успешно",
        message: "Учетные данные сохранены",
      });
    } catch (error: any) {
      showNotification({
        type: "error",
        title: "Ошибка",
        message: error?.message || "Не удалось сохранить учетные данные",
      });
    }
  };

  if (!selectedServer && !selectedService) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 mx-auto">
            <Icon name="server" className="w-12 h-12 text-blue-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Управление серверами
        </h2>
        <p className="text-gray-400 text-sm max-w-md">
          Выберите сервер или сервис из списка слева для просмотра деталей и
          управления подключением
        </p>
      </div>
    );
  }

  if (selectedService) {
    return (
      <div className="flex flex-col h-full">
        {/* Заголовок сервиса */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedService.protocol === "ssh"
                  ? "bg-green-500/20"
                  : "bg-blue-500/20"
              }`}
            >
              <Icon
                name={
                  selectedService.protocol === "ssh" ? "terminal" : "monitor"
                }
                className={`w-6 h-6 ${
                  selectedService.protocol === "ssh"
                    ? "text-green-400"
                    : "text-blue-400"
                }`}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {selectedService.protocol.toUpperCase()} Подключение
              </h2>
              <p className="text-gray-400 text-sm">
                {selectedService.host}:{selectedService.port}
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isServiceConnected
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-500/20 text-gray-400"
              }`}
            >
              {isServiceConnected ? "Подключено" : "Отключено"}
            </div>
          </div>
        </div>

        {/* Информация о сервисе */}
        <div className="space-y-4 mb-6">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2e2e2e]">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Информация о подключении
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Протокол</span>
                <span className="text-white font-medium">
                  {selectedService.protocol.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Хост</span>
                <span className="text-white font-medium">
                  {selectedService.host}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Порт</span>
                <span className="text-white font-medium">
                  {selectedService.port}
                </span>
              </div>
            </div>
          </div>

          {/* Учетные данные */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2e2e2e]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">
                Учетные данные
              </h3>
              {!editingCredentials && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCredentials(true)}
                >
                  Изменить
                </Button>
              )}
            </div>
            {editingCredentials ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Имя пользователя
                  </label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Введите имя пользователя"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Пароль (необязательно)
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCredentials(false);
                      setUsername("");
                      setPassword("");
                    }}
                  >
                    Отмена
                  </Button>
                  <Button size="sm" onClick={handleSaveCredentials} cta>
                    Сохранить
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                Нажмите "Изменить" для настройки учетных данных
              </p>
            )}
          </div>
        </div>

        {/* Кнопка подключения */}
        <div className="mt-auto">
          <Button
            onClick={handleToggleConnection}
            variant={isServiceConnected ? "danger" : "primary"}
            size="lg"
            cta
            className="w-full"
          >
            {isServiceConnected ? "Отключиться" : "Подключиться"}
          </Button>
        </div>
      </div>
    );
  }

  if (selectedServer) {
    const connectedCount = selectedServer.services.filter((s) =>
      connected_services.includes(s.id)
    ).length;

    return (
      <div className="flex flex-col h-full">
        {/* Заголовок сервера */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Icon name="server" className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {selectedServer.name}
              </h2>
              {selectedServer.description && (
                <p className="text-gray-400 text-sm">
                  {selectedServer.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2e2e2e]">
            <div className="text-gray-400 text-xs mb-1">Всего сервисов</div>
            <div className="text-2xl font-bold text-white">
              {selectedServer.services.length}
            </div>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2e2e2e]">
            <div className="text-gray-400 text-xs mb-1">Подключено</div>
            <div className="text-2xl font-bold text-green-400">
              {connectedCount}
            </div>
          </div>
        </div>

        {/* Список сервисов */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Сервисы
          </h3>
          <div className="space-y-2">
            {selectedServer.services.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Нет сервисов на этом сервере
              </div>
            ) : (
              selectedServer.services.map((service) => {
                const isConnected = connected_services.includes(service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`bg-[#1a1a1a] rounded-xl p-4 border cursor-pointer transition-all ${
                      selectedServiceId === service.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-[#2e2e2e] hover:border-[#3e3e3e]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          service.protocol === "ssh"
                            ? "bg-green-500/20"
                            : "bg-blue-500/20"
                        }`}
                      >
                        <Icon
                          name={
                            service.protocol === "ssh" ? "terminal" : "monitor"
                          }
                          className={`w-5 h-5 ${
                            service.protocol === "ssh"
                              ? "text-green-400"
                              : "text-blue-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">
                          {service.host}:{service.port}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {service.protocol.toUpperCase()}
                        </div>
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isConnected ? "bg-green-400" : "bg-gray-500"
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

