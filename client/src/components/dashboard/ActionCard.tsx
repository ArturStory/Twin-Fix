import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { ArrowRight, PlusCircle, Map, BarChart } from "lucide-react";

type ColorScheme = "primary" | "success" | "warning" | "info" | "default";

interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  link: string;
  color?: ColorScheme;
}

export default function ActionCard({
  icon,
  title,
  description,
  link,
  color = "default"
}: ActionCardProps) {
  // Map color scheme to CSS classes
  const colorClasses: Record<ColorScheme, { bg: string, iconBg: string, text: string }> = {
    primary: {
      bg: "bg-primary bg-opacity-10 border border-primary border-opacity-20",
      iconBg: "bg-primary bg-opacity-20",
      text: "text-primary"
    },
    success: {
      bg: "bg-white border border-gray-200",
      iconBg: "bg-green-100",
      text: "text-green-600"
    },
    warning: {
      bg: "bg-white border border-gray-200",
      iconBg: "bg-amber-100",
      text: "text-amber-600"
    },
    info: {
      bg: "bg-white border border-gray-200",
      iconBg: "bg-blue-100",
      text: "text-blue-600"
    },
    default: {
      bg: "bg-white border border-gray-200",
      iconBg: "bg-gray-100",
      text: "text-gray-600"
    }
  };

  const classes = colorClasses[color];

  // Render appropriate icon
  const renderIcon = () => {
    switch (icon) {
      case "plus-circle":
        return <PlusCircle className={`${classes.text} text-xl`} />;
      case "map":
        return <Map className={`${classes.text} text-xl`} />;
      case "bar-chart":
        return <BarChart className={`${classes.text} text-xl`} />;
      default:
        return <PlusCircle className={`${classes.text} text-xl`} />;
    }
  };

  return (
    <Link href={link} className={cn(
        "rounded-lg p-6 flex items-center transition-all duration-200 hover:shadow-md",
        classes.bg
      )}>
        <div className={cn(
          "rounded-full p-3 mr-4",
          classes.iconBg
        )}>
          {renderIcon()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <ArrowRight className={cn(
          "ml-auto",
          color === "primary" ? "text-primary" : "text-gray-400"
        )} />
    </Link>
  );
}
