import { NotFoundException } from "@nestjs/common";
import { NotificationType, Permission, Roles } from "@prisma/client";
import type { PrismaService } from "src/prisma/prisma.service";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  it("creates a notification for a single user", async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new NotificationService({
      notification: { createMany },
    } as unknown as PrismaService);

    await service.create(
      "user-1",
      NotificationType.report_created,
      "Nouveau signalement.",
      { link: "/reports/1", applicationId: "app-1" },
    );

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-1",
          type: NotificationType.report_created,
          message: "Nouveau signalement.",
          link: "/reports/1",
          applicationId: "app-1",
        },
      ],
    });
  });

  it("dedupes recipients and no-ops on an empty recipient list", async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new NotificationService({
      notification: { createMany },
    } as unknown as PrismaService);

    await service.createForUsers(
      ["user-1", "user-1"],
      NotificationType.user_blocked,
      "Votre compte a été bloqué.",
    );
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].data).toHaveLength(1);

    await service.createForUsers(
      [],
      NotificationType.user_blocked,
      "Votre compte a été bloqué.",
    );
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it("never throws when notification persistence fails", async () => {
    const createMany = jest.fn().mockRejectedValue(new Error("db down"));
    const service = new NotificationService({
      notification: { createMany },
    } as unknown as PrismaService);

    await expect(
      service.create("user-1", NotificationType.user_blocked, "message"),
    ).resolves.toBeUndefined();
  });

  it("paginates a user's notifications, most recent first", async () => {
    const paginate = jest.fn().mockResolvedValue({ results: [], total: 0 });
    const service = new NotificationService({
      notification: { paginate },
    } as unknown as PrismaService);

    await service.findAllForUser("user-1", { page: 1, pageSize: 10 });

    expect(paginate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      page: 1,
      pageSize: 10,
    });
  });

  it("honors an explicit sort order for the date column", async () => {
    const paginate = jest.fn().mockResolvedValue({ results: [], total: 0 });
    const service = new NotificationService({
      notification: { paginate },
    } as unknown as PrismaService);

    await service.findAllForUser("user-1", {
      page: 0,
      pageSize: 10,
      order: "asc",
    });

    expect(paginate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "asc" },
      page: 0,
      pageSize: 10,
    });
  });

  it("counts unread notifications for a user", async () => {
    const count = jest.fn().mockResolvedValue(3);
    const service = new NotificationService({
      notification: { count },
    } as unknown as PrismaService);

    await expect(service.countUnread("user-1")).resolves.toEqual({
      count: 3,
    });
    expect(count).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
    });
  });

  it("marks a notification as read, scoped to its owner", async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new NotificationService({
      notification: { updateMany },
    } as unknown as PrismaService);

    await service.markAsRead("user-1", "notif-1");

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "notif-1", userId: "user-1" },
      data: { isRead: true },
    });
  });

  it("throws NotFoundException marking as read a notification owned by another user or missing", async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const service = new NotificationService({
      notification: { updateMany },
    } as unknown as PrismaService);

    await expect(service.markAsRead("user-1", "notif-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("marks all of a user's unread notifications as read", async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 5 });
    const service = new NotificationService({
      notification: { updateMany },
    } as unknown as PrismaService);

    await service.markAllAsRead("user-1");

    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
      data: { isRead: true },
    });
  });

  it("deletes a notification scoped to its owner", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new NotificationService({
      notification: { deleteMany },
    } as unknown as PrismaService);

    await service.delete("user-1", "notif-1");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "notif-1", userId: "user-1" },
    });
  });

  it("throws NotFoundException deleting a notification owned by another user or missing", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const service = new NotificationService({
      notification: { deleteMany },
    } as unknown as PrismaService);

    await expect(service.delete("user-1", "notif-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("deletes several notifications scoped to their owner", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const service = new NotificationService({
      notification: { deleteMany },
    } as unknown as PrismaService);

    await service.deleteMany("user-1", ["notif-1", "notif-2"]);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["notif-1", "notif-2"] }, userId: "user-1" },
    });
  });

  describe("findEmailForNotification", () => {
    it("returns the e-mail linked to the notification, scoped to its owner", async () => {
      const notificationFindFirst = jest
        .fn()
        .mockResolvedValue({ emailLogId: "email-log-1" });
      const emailLogFindUnique = jest
        .fn()
        .mockResolvedValue({ id: "email-log-1", subject: "Sujet" });
      const service = new NotificationService({
        notification: { findFirst: notificationFindFirst },
        emailLog: { findUnique: emailLogFindUnique },
      } as unknown as PrismaService);

      const result = await service.findEmailForNotification(
        "user-1",
        "notif-1",
      );

      expect(notificationFindFirst).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-1" },
        select: { emailLogId: true },
      });
      expect(emailLogFindUnique).toHaveBeenCalledWith({
        where: { id: "email-log-1" },
      });
      expect(result).toEqual({ id: "email-log-1", subject: "Sujet" });
    });

    it("throws NotFoundException when the notification isn't the user's own", async () => {
      const notificationFindFirst = jest.fn().mockResolvedValue(null);
      const service = new NotificationService({
        notification: { findFirst: notificationFindFirst },
      } as unknown as PrismaService);

      await expect(
        service.findEmailForNotification("user-1", "notif-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when the notification has no associated e-mail", async () => {
      const notificationFindFirst = jest
        .fn()
        .mockResolvedValue({ emailLogId: null });
      const service = new NotificationService({
        notification: { findFirst: notificationFindFirst },
      } as unknown as PrismaService);

      await expect(
        service.findEmailForNotification("user-1", "notif-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findUsersWithReportManagePermission", () => {
    it("combines role holders, individual permission holders and, when scoped, app actors", async () => {
      const userFindMany = jest
        .fn()
        .mockResolvedValueOnce([{ id: "contributor-1" }, { id: "admin-1" }]) // role layer
        .mockResolvedValueOnce([{ id: "reader-with-perm-1" }]) // additionalPermissions layer
        .mockResolvedValueOnce([{ id: "actor-user-1" }]); // resolved actor emails -> users
      const actorFindMany = jest
        .fn()
        .mockResolvedValue([{ email: "actor@example.com" }]);
      const service = new NotificationService({
        user: { findMany: userFindMany },
        actor: { findMany: actorFindMany },
      } as unknown as PrismaService);

      const result = await service.findUsersWithReportManagePermission("app-1");

      expect(userFindMany).toHaveBeenNthCalledWith(1, {
        where: { role: { in: [Roles.CONTRIBUTOR, Roles.ADMIN] } },
        select: { id: true },
      });
      expect(userFindMany).toHaveBeenNthCalledWith(2, {
        where: {
          additionalPermissions: { has: Permission.ReportManage },
        },
        select: { id: true },
      });
      expect(actorFindMany).toHaveBeenCalledWith({
        where: {
          applicationId: "app-1",
          isGroup: false,
          email: { not: null },
          actorType: { appPermissions: { some: { ReportManage: true } } },
        },
        select: { email: true },
      });
      expect(result).toEqual(
        expect.arrayContaining([
          "contributor-1",
          "admin-1",
          "reader-with-perm-1",
          "actor-user-1",
        ]),
      );
      expect(result).toHaveLength(4);
    });

    it("skips the actor-type layer when no applicationId is given", async () => {
      const userFindMany = jest
        .fn()
        .mockResolvedValueOnce([{ id: "contributor-1" }])
        .mockResolvedValueOnce([]);
      const actorFindMany = jest.fn();
      const service = new NotificationService({
        user: { findMany: userFindMany },
        actor: { findMany: actorFindMany },
      } as unknown as PrismaService);

      const result = await service.findUsersWithReportManagePermission();

      expect(actorFindMany).not.toHaveBeenCalled();
      expect(result).toEqual(["contributor-1"]);
    });
  });
});
