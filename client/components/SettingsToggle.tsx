import { Icon } from "~/components/ui/icon";
import { CogIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

export default function SettingsToggle() {
	const router = useRouter();

	return (
		<Pressable
			onPress={() => router.navigate("/setup/base-url")}
			className="web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2 active:opacity-70"
		>
			<View className="flex-1 aspect-square pt-0.5 justify-center items-start web:px-5">
				<Icon
					as={CogIcon}
					className="text-foreground"
					size={23}
					strokeWidth={1.25}
				/>
			</View>
		</Pressable>
	);
}
