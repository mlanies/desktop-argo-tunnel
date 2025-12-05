import { useState } from "react";
import { useStore } from "../store";
import Toggle from "./Toggle/Toggle";
import Icon from "./Icon/Icon";
import Button from "./Button/Button";
import Modal from "./Modal/Modal";
import Input from "./Input/Input";
import { useNotifications } from "./NotificationSystem";
import { safeInvoke } from "../utils/tauriUtils";
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const {
    services_by_server_by_company,
    connected_services,
    selectedServerId,
    selectedServiceId,
    handleConnectService,
    handleDisconnectService,
    setSelectedServer,
    setSelectedService,
  } = useStore();
  const { showNotification } = useNotifications();


  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  
  // Формы
  const [serverName, setServerName] = useState("");
  const [serverDescription, setServerDescription] = useState("");
  const [serviceHost, setServiceHost] = useState("");
  const [servicePort, setServicePort] = useState("");
  const [serviceProtocol, setServiceProtocol] = useState<"ssh" | "rdp">("ssh");

  // Remove search state and filtering logic
  // const [search, setSearch] = useState("");
  // const filteredCompanies = services_by_server_by_company.filter((company) =>
  //   company.name.toLowerCase().includes(search.toLowerCase()),
  // );
  const filteredCompanies = services_by_server_by_company;

  const toggleService = (serviceId: string) => {
    if (!connected_services.includes(serviceId)) {
      handleConnectService(serviceId); // мгновенно обновить UI
      safeInvoke("connect_service", { serviceId });
    } else {
      handleDisconnectService(serviceId); // мгновенно обновить UI
      safeInvoke("disconnect_service", { serviceId });
    }
  };

  const handleAddServer = async () => {
    if (!serverName.trim()) {
      showNotification({
        type: 'warning',
        title: 'Ошибка',
        message: 'Введите название сервера'
      });
      return;
    }
    
    try {
      await safeInvoke("add_server", {
        name: serverName,
        description: serverDescription || null,
      });
      setServerName("");
      setServerDescription("");
      setShowAddServerModal(false);
      showNotification({
        type: 'success',
        title: 'Успешно',
        message: 'Сервер добавлен'
      });
    } catch (error: any) {
      console.error("Failed to add server:", error);
      showNotification({
        type: 'error',
        title: 'Ошибка',
        message: error?.message || 'Не удалось добавить сервер'
      });
    }
  };

  const handleAddService = async () => {
    if (!serviceHost.trim() || !servicePort.trim() || !selectedServerId) {
      showNotification({
        type: 'warning',
        title: 'Ошибка',
        message: 'Заполните все поля'
      });
      return;
    }
    
    const port = parseInt(servicePort);
    if (isNaN(port) || port < 1 || port > 65535) {
      showNotification({
        type: 'warning',
        title: 'Ошибка',
        message: 'Порт должен быть числом от 1 до 65535'
      });
      return;
    }

    try {
      await safeInvoke("add_service", {
        serverId: selectedServerId,
        protocol: serviceProtocol,
        host: serviceHost,
        port: port,
      });
      setServiceHost("");
      setServicePort("");
      setSelectedServer(null);
      setShowAddServiceModal(false);
      showNotification({
        type: 'success',
        title: 'Успешно',
        message: 'Сервис добавлен'
      });
    } catch (error: any) {
      console.error("Failed to add service:", error);
      showNotification({
        type: 'error',
        title: 'Ошибка',
        message: error?.message || 'Не удалось добавить сервис'
      });
    }
  };

  const openAddServiceModal = (serverId: string) => {
    setSelectedServer(serverId);
    setShowAddServiceModal(true);
  };

  return (
    <aside className="flex flex-col h-full bg-[#0e0e10] rounded-3xl shadow-inner">
      {/* Заголовок */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs tracking-widest text-gray-400 uppercase">Сервера</h2>
          <button
            onClick={() => setShowAddServerModal(true)}
            className="p-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
            title="Добавить сервер"
          >
            <Icon name="plus" className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      {/* Компактный список компаний */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {filteredCompanies.length > 0 ? (
          <div className="flex flex-col gap-1">
            {filteredCompanies.map((company) => (
              <div key={company.id} className={`company-block ${expandedCompanyId === company.id ? styles.active : ''}`}>
                <div
                  className={`company-title flex items-center gap-2 cursor-pointer px-2 py-2 rounded-lg transition-colors ${expandedCompanyId === company.id ? 'text-blue-400' : 'text-gray-200 hover:text-blue-400'}`}
                  onClick={() => setExpandedCompanyId(expandedCompanyId === company.id ? null : company.id)}
                >
                  <Icon name="home" className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-sm flex-1 truncate">{company.name}</span>
                  <Icon name="chevron" className={`w-4 h-4 ml-auto transition-transform ${expandedCompanyId === company.id ? 'rotate-90' : ''}`} />
                </div>
                <div className={`collapsible-content ${expandedCompanyId === company.id ? 'open' : ''}`}
                  style={{ maxHeight: expandedCompanyId === company.id ? 500 : 0, opacity: expandedCompanyId === company.id ? 1 : 0, overflow: 'hidden', transform: expandedCompanyId === company.id ? 'translateY(0)' : 'translateY(-10px)' }}
                >
                  <div className="flex flex-col gap-2 mt-2">
                    {company.servers.map((server) => (
                      <div key={server.id} className="flex flex-col gap-1">
                        <div 
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            selectedServerId === server.id
                              ? "bg-blue-500/20 border border-blue-500/30"
                              : "hover:bg-[#2e2e2e]"
                          }`}
                          onClick={() => {
                            setSelectedServer(server.id);
                            setSelectedService(null);
                          }}
                        >
                          <span className={`text-xs font-medium ${
                            selectedServerId === server.id ? "text-blue-400" : "text-gray-300"
                          }`}>{server.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddServiceModal(server.id);
                            }}
                            className="p-1 rounded hover:bg-[#3e3e3e] transition-colors"
                            title="Добавить сервис"
                          >
                            <Icon name="plus" className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                        {server.services.map((service) => {
                          const isConnected = connected_services.includes(service.id);
                          const isSelected = selectedServiceId === service.id;
                          return (
                            <div 
                              key={service.id} 
                              onClick={() => setSelectedService(service.id)}
                              className={`flex items-center gap-3 bg-[#1f1f1f] border rounded-lg px-2 py-1.5 transition-all cursor-pointer group ${
                                isSelected
                                  ? "border-blue-500/50 bg-blue-500/10"
                                  : "border-[#2e2e2e] hover:border-[#3e3e3e]"
                              }`}
                            >
                              {/* Иконка сервиса */}
                              <Icon
                                name={service.protocol === 'ssh' ? 'terminal' : service.protocol === 'rdp' ? 'monitor' : 'home'}
                                className={service.protocol === 'ssh' ? 'w-4 h-4 text-green-400' : service.protocol === 'rdp' ? 'w-4 h-4 text-blue-400' : 'w-4 h-4'}
                              />
                              {/* Информация о сервисе */}
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs truncate font-medium ${
                                  isSelected ? "text-blue-300" : "text-gray-200"
                                }`}>{service.host}:{service.port}</div>
                                <div className="text-[10px] text-gray-500">{service.protocol.toUpperCase()}</div>
                              </div>
                              {/* Статус подключения */}
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  isConnected ? "bg-green-400" : "bg-gray-500"
                                }`} />
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Toggle
                                    checked={isConnected}
                                    onChange={() => toggleService(service.id)}
                                    className="shrink-0"
                                    size="md"
                                    variant={service.protocol === 'ssh' ? 'success' : service.protocol === 'rdp' ? 'default' : 'default'}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm mb-4">Нет доступных серверов</div>
            <Button onClick={() => setShowAddServerModal(true)} cta>
              Добавить сервер
            </Button>
          </div>
        )}
      </div>

      {/* Модальное окно добавления сервера */}
      <Modal
        isOpen={showAddServerModal}
        onClose={() => {
          setShowAddServerModal(false);
          setServerName("");
          setServerDescription("");
        }}
        title="Добавить сервер"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Название сервера</label>
            <Input
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Введите название сервера"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Описание (необязательно)</label>
            <Input
              value={serverDescription}
              onChange={(e) => setServerDescription(e.target.value)}
              placeholder="Введите описание"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={() => setShowAddServerModal(false)}>Отмена</Button>
            <Button onClick={handleAddServer} cta disabled={!serverName.trim()}>
              Добавить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно добавления сервиса */}
      <Modal
        isOpen={showAddServiceModal}
        onClose={() => {
          setShowAddServiceModal(false);
          setServiceHost("");
          setServicePort("");
          setSelectedServer(null);
        }}
        title="Добавить сервис"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Протокол</label>
            <select
              value={serviceProtocol}
              onChange={(e) => setServiceProtocol(e.target.value as "ssh" | "rdp")}
              className="w-full p-2 bg-[#1f1f1f] border border-[#2e2e2e] rounded-lg text-white"
            >
              <option value="ssh">SSH</option>
              <option value="rdp">RDP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Хост</label>
            <Input
              value={serviceHost}
              onChange={(e) => setServiceHost(e.target.value)}
              placeholder="example.com или IP адрес"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Порт</label>
            <Input
              type="number"
              value={servicePort}
              onChange={(e) => setServicePort(e.target.value)}
              placeholder="22 для SSH, 3389 для RDP"
              min="1"
              max="65535"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={() => setShowAddServiceModal(false)}>Отмена</Button>
            <Button onClick={handleAddService} cta disabled={!serviceHost.trim() || !servicePort.trim()}>
              Добавить
            </Button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
