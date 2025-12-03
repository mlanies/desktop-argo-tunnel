import BaseInput from "./Input/Input";
import Checkbox from "./Checkbox/Checkbox";

export default function RdpForm({
  credential,
  remember,
}: {
  credential?: {
    RdpUserPassword: {
      login: string;
      password: string;
      domain: string;
    };
  };
  remember?: boolean;
}) {
  const login = credential?.RdpUserPassword?.login || "";
  const password = credential?.RdpUserPassword?.password || "";
  const domain = credential?.RdpUserPassword?.domain || "";

  return (
    <div className="flex flex-col gap-4">
      <BaseInput name="login" placeholder="Login" defaultValue={login} />
      <BaseInput
        name="password"
        type="password"
        placeholder="Password"
        defaultValue={password}
      />
      <BaseInput name="domain" placeholder="Domain" defaultValue={domain} />

      <Checkbox name="remember" label="Remember me" defaultChecked={remember} />
    </div>
  );
}
