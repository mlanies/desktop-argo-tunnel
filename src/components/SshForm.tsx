import BaseInput from "./Input/Input";
import Checkbox from "./Checkbox/Checkbox";

export default function SshForm({
  credential,
  remember,
}: {
  credential?:
    | {
        SshUserPassword: { login: string; password: string };
      }
    | {
        SshKey: { login: string; key: string };
      };
  remember?: boolean;
}) {
  const login =
    credential &&
    ("SshUserPassword" in credential
      ? credential.SshUserPassword.login
      : credential.SshKey?.login);
  const password =
    credential && "SshUserPassword" in credential
      ? credential.SshUserPassword.password
      : undefined;

  const key =
    credential && "SshKey" in credential ? credential.SshKey.key : undefined;

  return (
    <div className="flex flex-col gap-4">
      <BaseInput name="login" placeholder="Login" defaultValue={login} />
      <BaseInput
        name="password"
        type="password"
        placeholder="Password"
        defaultValue={password}
      />

      {/* Красивый разделитель */}
      <div className="flex items-center justify-center gap-2 text-gray-400 text-xs my-2">
        <div className="w-full h-px bg-gray-700" />
        <span className="whitespace-nowrap">Or key</span>
        <div className="w-full h-px bg-gray-700" />
      </div>

      <BaseInput name="key" placeholder="Key" defaultValue={key} />
      <Checkbox name="remember" label="Remember me" defaultChecked={remember} />
    </div>
  );
}
