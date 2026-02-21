"use client";

import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { usePageBuilderStore } from "@/store/page-builder.store";
import { WidgetGrid } from "@/components/dashboard-builder/widget-grid";
import { FileText, ShieldX } from "lucide-react";

export default function CustomPageRenderer() {
    const params = useParams();
    const slug = params.slug as string;
    const role = useAuthStore((s) => s.currentUser.role);
    const page = usePageBuilderStore((s) => s.getPageBySlug(slug));

    if (!page) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Page Not Found</h2>
                    <p className="text-sm text-muted-foreground">
                        The custom page &ldquo;{slug}&rdquo; does not exist.
                    </p>
                </div>
            </div>
        );
    }

    if (!page.allowedRoles.includes(role) && role !== "admin") {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center space-y-2">
                    <ShieldX className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Access Restricted</h2>
                    <p className="text-sm text-muted-foreground">
                        You don&rsquo;t have permission to view this page.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
                {page.description && (
                    <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                )}
            </div>
            {page.widgets.length === 0 ? (
                <div className="flex items-center justify-center h-[40vh] border border-dashed rounded-xl">
                    <div className="text-center space-y-2">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">This page has no widgets configured yet.</p>
                    </div>
                </div>
            ) : (
                <WidgetGrid widgets={page.widgets} />
            )}
        </div>
    );
}
