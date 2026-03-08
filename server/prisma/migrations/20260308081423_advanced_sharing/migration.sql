-- AlterTable
ALTER TABLE `document_shares` ADD COLUMN `allow_download` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `burn_after_read` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `document_share_events` (
    `id` VARCHAR(191) NOT NULL,
    `share_id` VARCHAR(191) NOT NULL,
    `event_type` ENUM('LINK_OPENED', 'PASSWORD_SUCCESS', 'PASSWORD_FAIL', 'VIEWED', 'DOWNLOADED', 'BLOCKED') NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `document_share_events_share_id_idx`(`share_id`),
    INDEX `document_share_events_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `document_share_events` ADD CONSTRAINT `document_share_events_share_id_fkey` FOREIGN KEY (`share_id`) REFERENCES `document_shares`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
